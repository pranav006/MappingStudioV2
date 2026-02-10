import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Layout,
    Button,
    Input,
    Select,
    Segmented,
    Tree,
    Badge,
    Space,
    ConfigProvider,
    message,
    Table,
    Tag,
    Modal,
    Spin,
    Empty,
    Card,
    Typography,
    Divider,
    Tooltip
} from 'antd';
import {
    PlusOutlined,
    ArrowLeftOutlined,
    ArrowRightOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    FileTextOutlined,
    CheckCircleFilled,
    AppstoreOutlined,
    ThunderboltOutlined,
    ExportOutlined,
    HistoryOutlined,
    CodeOutlined,
    DeploymentUnitOutlined,
    SafetyCertificateOutlined,
    GlobalOutlined,
    SearchOutlined,
    SwapOutlined,
    FileExcelOutlined,
    CloudUploadOutlined,
    ToolOutlined,
    FlagOutlined,
    FlagFilled,
    EditOutlined,
    ApartmentOutlined,
    FileOutlined,
    LogoutOutlined,
    UserOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// BACKEND API BASE (set VITE_API_BASE in production, e.g. https://your-backend.herokuapp.com/api)
const API = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

// --- ENTERPRISE DESIGN TOKENS ---
const THEME_TOKENS = {
    colorPrimary: '#10B981', // Studio Green
    colorBgLayout: '#FFFFFF',
    borderRadius: 6,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const STYLES = {
    mainWrapper: "h-screen w-full flex bg-white overflow-hidden",
    sidebar: "bg-white border-r border-[rgba(0,0,0,0.06)] h-full overflow-hidden flex flex-col relative z-20",
    panelTitle: "text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#475569] px-6 py-5 border-b border-[rgba(0,0,0,0.04)] flex items-center justify-between bg-white",
    premiumHeader: "bg-white border-b border-[rgba(0,0,0,0.04)] px-8 flex items-center justify-between h-16 shrink-0 sticky top-0 z-50 relative",
    glassCard: "bg-white border border-[rgba(0,0,0,0.06)] rounded-xl bg-slate-50/30 hover:border-[rgba(0,0,0,0.07)] transition-colors duration-200",
};

// --- ENTERPRISE SCHEMA DEFINITIONS ---
const SCHEMA_FORMATS = [
    'EDI 834 v5010',
    'EDI 837P',
    'JSON Schema',
    'CSV / Delimited',
    'XML / XSD',
    'DFF (Data Field File)',
    'PFF (Position Fixed File)'
];

const SCHEMAS = {
    'EDI 834 v5010': [
        {
            title: 'Interchange Control (ISA)',
            key: 'ISA',
            children: [
                { title: 'ISA05 • Sender Qualifier', key: 'ISA05', isLeaf: true },
                { title: 'ISA06 • Sender ID', key: 'ISA06', isLeaf: true },
                { title: 'ISA07 • Receiver Qualifier', key: 'ISA07', isLeaf: true },
                { title: 'ISA08 • Receiver ID', key: 'ISA08', isLeaf: true },
                { title: 'ISA13 • Control Number', key: 'ISA13', isLeaf: true },
            ]
        },
        {
            title: 'Member Loop (2000)',
            key: '2000',
            children: [
                {
                    title: 'INS • Member Level Detail',
                    key: 'INS',
                    children: [
                        { title: 'INS01 • Relationship Code', key: 'INS01', isLeaf: true },
                        { title: 'INS03 • Maintenance Type', key: 'INS03', isLeaf: true },
                        { title: 'INS08 • Employment Status', key: 'INS08', isLeaf: true },
                    ]
                },
                {
                    title: 'NM1 • Member Name',
                    key: 'NM1',
                    children: [
                        { title: 'NM103 • Last Name', key: 'NM103', isLeaf: true },
                        { title: 'NM104 • First Name', key: 'NM104', isLeaf: true },
                        { title: 'NM109 • ID Code (SSN)', key: 'NM109', isLeaf: true },
                    ]
                }
            ]
        }
    ],
    'EDI 837P': [
        {
            title: 'Submitter Loop (1000A)',
            key: '1000A',
            children: [
                { title: 'NM103 • Submitter Name', key: 'NM103_S', isLeaf: true },
                { title: 'PER04 • Submitter Phone', key: 'PER04_S', isLeaf: true },
            ]
        },
        {
            title: 'Billing Provider (2010AA)',
            key: '2010AA',
            children: [
                { title: 'NM109 • Provider NPI', key: 'NM109_P', isLeaf: true },
                { title: 'N301 • Address Line 1', key: 'N301_P', isLeaf: true },
            ]
        }
    ],
    'JSON Schema': [
        {
            title: 'Unified Model',
            key: 'uim',
            children: [
                {
                    title: 'Party Information',
                    key: 'party',
                    children: [
                        { title: 'firstName', key: 'fname', isLeaf: true },
                        { title: 'lastName', key: 'lname', isLeaf: true },
                        { title: 'taxIdentifier', key: 'tax_id', isLeaf: true },
                        { title: 'dateOfBirth', key: 'dob', isLeaf: true },
                    ]
                }
            ]
        }
    ]
};

const ROLE_KEY = 'mappingstudio_role';
const ACCESS_KEY_STORAGE = 'mappingstudio_access_key';

// Map UI schema names to backend EDI schema file keys (no .json)
const EDI_SCHEMA_API_KEYS = {
    'EDI 834 v5010': '834_5010',
    'EDI 837P': '837P_5010',
};

const LOGIN_ROLES = [
    { value: 'ba', label: 'BA', description: 'Business Analyst — create specs and mapping logic', Icon: FileTextOutlined },
    { value: 'dev', label: 'Dev', description: 'Developer — view specs and generate EMS', Icon: CodeOutlined },
    { value: 'client', label: 'Client', description: 'Client — update business logic and add comments', Icon: UserOutlined },
];

function LoginScreen({ apiBase, onSuccess }) {
    const [step, setStep] = useState('role'); // 'role' | 'ba' | 'dev' | 'client'
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRoleSelect = (role) => setStep(role);
    const handleBack = () => { setStep('role'); setKey(''); setError(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!key.trim()) return;
        const role = step;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiBase}/auth/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessKey: key.trim() })
            });
            if (res.ok) {
                try {
                    sessionStorage.setItem(ACCESS_KEY_STORAGE, key.trim());
                    localStorage.setItem(ROLE_KEY, role);
                } catch (_) {}
                onSuccess(key.trim(), role);
            } else {
                setError('Invalid access key');
            }
        } catch {
            const isLocal = apiBase.includes('localhost') || apiBase.includes('127.0.0.1');
            setError(isLocal
                ? 'Could not reach server. Is the backend running? (e.g. port 8080)'
                : `Could not reach server at ${apiBase}. Check URL and CORS.`);
        } finally {
            setLoading(false);
        }
    };

    // Step 1: Choose which type of user is signing in (horizontal, icon per role, description on hover)
    if (step === 'role') {
        return (
            <div className="h-screen w-full flex bg-white items-center justify-center p-6">
                <div className="w-full max-w-3xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-3 rounded-xl bg-emerald-500 mb-4">
                            <ThunderboltOutlined className="text-white text-2xl" />
                        </div>
                        <Title level={4} className="!mb-1 text-[#0F172A]">MappingStudio</Title>
                        <Text className="text-sm text-[#64748B]">Sign in as</Text>
                    </div>
                    <div className="flex flex-row justify-center gap-6 flex-wrap">
                        {LOGIN_ROLES.map(({ value, label, description, Icon }) => (
                            <Card
                                key={value}
                                hoverable
                                className="group rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white shadow-sm cursor-pointer transition-all hover:border-emerald-200 hover:shadow-md flex-1 min-w-[140px] max-w-[200px]"
                                bodyStyle={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                                onClick={() => handleRoleSelect(value)}
                            >
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
                                    <Icon className="text-3xl" />
                                </div>
                                <div className="font-semibold text-[#0F172A] mb-2">{label}</div>
                                <div className="text-[11px] text-[#64748B] leading-tight min-h-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    {description}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Role-specific login (access key only)
    const roleLabel = LOGIN_ROLES.find(r => r.value === step)?.label ?? step;
    return (
        <div className="h-screen w-full flex bg-white items-center justify-center p-6">
            <Card className="max-w-sm w-full rounded-2xl border border-[rgba(0,0,0,0.06)] p-8 bg-white shadow-sm relative" style={{ maxWidth: '24rem' }}>
                <Button type="text" size="small" className="text-[#64748B] hover:text-[#10B981] -ml-1 mb-2 block" onClick={handleBack}>
                    ← Back
                </Button>
                <div className="text-center mb-6">
                    <div className="inline-flex p-3 rounded-xl bg-emerald-500 mb-4">
                        <ThunderboltOutlined className="text-white text-2xl" />
                    </div>
                    <Title level={4} className="!mb-1 text-[#0F172A]">MappingStudio</Title>
                    <Text className="text-sm text-[#64748B]">{roleLabel} login</Text>
                </div>
                <form onSubmit={handleSubmit}>
                    <Input.Password
                        placeholder="Access key"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        size="large"
                        className="mb-4"
                        disabled={loading}
                        autoFocus
                    />
                    {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
                    <Button type="primary" htmlType="submit" block size="large" loading={loading} className="font-semibold bg-emerald-500 hover:bg-emerald-600">
                        Sign in
                    </Button>
                </form>
            </Card>
        </div>
    );
}

export default function App() {
    const [accessKey, setAccessKey] = useState(() => {
        try { return sessionStorage.getItem(ACCESS_KEY_STORAGE) || ''; } catch { return ''; }
    });
    const [schemaList, setSchemaList] = useState([]);
    const [schemaTrees, setSchemaTrees] = useState({});
    const [userRole, setUserRole] = useState(() => {
        try {
            const r = localStorage.getItem(ROLE_KEY);
            return (r === 'dev' || r === 'client') ? r : 'ba';
        } catch { return 'ba'; }
    });
    const [view, setView] = useState('dashboard');
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [selectedSourceNode, setSelectedSourceNode] = useState(null);
    const [selectedTargetNode, setSelectedTargetNode] = useState(null);
    const [selectedLedgerMapping, setSelectedLedgerMapping] = useState(null);
    const [awaitingSourcePickForEdit, setAwaitingSourcePickForEdit] = useState(false);
    const [awaitingTargetPickForEdit, setAwaitingTargetPickForEdit] = useState(false);
    const [sourcePanelWidth, setSourcePanelWidth] = useState(320);
    const [targetPanelWidth, setTargetPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [sourceSchemaSearch, setSourceSchemaSearch] = useState('');
    const [targetSchemaSearch, setTargetSchemaSearch] = useState('');
    const [highlightedSourceKeys, setHighlightedSourceKeys] = useState([]);
    const [highlightedTargetKeys, setHighlightedTargetKeys] = useState([]);
    const [debouncedSourceSearch, setDebouncedSourceSearch] = useState('');
    const [debouncedTargetSearch, setDebouncedTargetSearch] = useState('');
    const [functionColumnVisible, setFunctionColumnVisible] = useState(false);
    const [functionSelections, setFunctionSelections] = useState({});
    const [functionOptions, setFunctionOptions] = useState([]);
    const resizingSource = useRef(false);
    const resizingTarget = useRef(false);
    const mainWrapperRef = useRef(null);
    const resizeStartX = useRef(0);
    const resizeStartSourceWidth = useRef(320);
    const resizeStartTargetWidth = useRef(320);

    const MIN_PANEL = 200;
    const MAX_PANEL = 560;

    const startResizeSource = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        resizingSource.current = true;
        resizingTarget.current = false;
        resizeStartX.current = e.clientX;
        resizeStartSourceWidth.current = sourcePanelWidth;
        setIsResizing(true);
        if (e.target instanceof HTMLElement && typeof e.pointerId === 'number') {
            e.target.setPointerCapture(e.pointerId);
        }
    }, [sourcePanelWidth]);

    const startResizeTarget = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        resizingSource.current = false;
        resizingTarget.current = true;
        resizeStartX.current = e.clientX;
        resizeStartTargetWidth.current = targetPanelWidth;
        setIsResizing(true);
        if (e.target instanceof HTMLElement && typeof e.pointerId === 'number') {
            e.target.setPointerCapture(e.pointerId);
        }
    }, [targetPanelWidth]);

    useEffect(() => {
        if (!isResizing) return;
        const onMove = (e) => {
            const x = e.clientX ?? (e.touches?.[0]?.clientX);
            if (x == null) return;
            if (resizingSource.current) {
                const delta = x - resizeStartX.current;
                const newWidth = Math.min(MAX_PANEL, Math.max(MIN_PANEL, resizeStartSourceWidth.current + delta));
                setSourcePanelWidth(newWidth);
            }
            if (resizingTarget.current) {
                const delta = resizeStartX.current - x;
                const newWidth = Math.min(MAX_PANEL, Math.max(MIN_PANEL, resizeStartTargetWidth.current + delta));
                setTargetPanelWidth(newWidth);
            }
        };
        const onUp = () => {
            resizingSource.current = false;
            resizingTarget.current = false;
            setIsResizing(false);
        };
        document.addEventListener('pointermove', onMove, { capture: true, passive: false });
        document.addEventListener('pointerup', onUp, { capture: true });
        document.addEventListener('mousemove', onMove, { capture: true, passive: false });
        document.addEventListener('mouseup', onUp, { capture: true });
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'auto';
        return () => {
            document.removeEventListener('pointermove', onMove, { capture: true });
            document.removeEventListener('pointerup', onUp, { capture: true });
            document.removeEventListener('mousemove', onMove, { capture: true });
            document.removeEventListener('mouseup', onUp, { capture: true });
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.style.pointerEvents = '';
        };
    }, [isResizing]);

    const setRole = (role) => {
        setUserRole(role);
        try { localStorage.setItem(ROLE_KEY, role); } catch (_) {}
        if (role === 'dev' || role === 'client') {
            setView('dashboard');
            setCurrentProject(null);
            setMappings([]);
            setFunctionColumnVisible(false);
            setFunctionSelections({});
        } else {
            // BA: if we were in dev-project view, go to dashboard so something always renders
            if (view === 'dev-project') {
                setView('dashboard');
                setCurrentProject(null);
            }
        }
    };

    useEffect(() => {
        if (view !== 'dev-project') {
            setFunctionColumnVisible(false);
            setFunctionSelections({});
        }
    }, [view]);

    const rowKeyForMapping = (m, idx) => m?.id ?? `${m?.source ?? 'src'}-${m?.target ?? 'tgt'}-${idx}`;
    const guessFunctionFromLogic = (logicText = '') => {
        const text = (logicText || '').toLowerCase();
        if (text.includes('date')) return 'convert_date';
        if (text.includes('trim') || text.includes('upper')) return 'trim_upper';
        if (text.includes('sum') || text.includes('amount')) return 'sum_amounts';
        if (text.includes('jsonata')) return 'jsonata';
        if (text.includes('qwasp')) return 'qwasp';
        return 'copy';
    };

    const escapeXml = (str = '') => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const functionTemplateForCode = (code) => {
        switch (code) {
            case 'trim_upper': return 'TrimUpper';
            case 'convert_date': return 'ConvertDateTime';
            case 'sum_amounts': return 'Sum';
            case 'jsonata': return 'JSONata';
            case 'qwasp': return 'QWASP';
            case 'custom_js': return 'JScript';
            default: return 'Copy';
        }
    };

    const generateEmsXml = (rows) => {
        const uniqueSources = [];
        const uniqueTargets = [];
        const sourceIdByKey = {};
        const targetIdByKey = {};
        rows.forEach((m) => {
            if (m.source && !sourceIdByKey[m.source]) {
                const id = 10 + uniqueSources.length;
                sourceIdByKey[m.source] = id;
                uniqueSources.push({ key: m.source, id });
            }
            if (m.target && !targetIdByKey[m.target]) {
                const id = 1000 + uniqueTargets.length;
                targetIdByKey[m.target] = id;
                uniqueTargets.push({ key: m.target, id });
            }
        });

        let cpCounter = 2000;
        const functionsXml = [];
        const connectorsXml = [];

        rows.forEach((m, idx) => {
            const fnId = idx + 1;
            const key = rowKeyForMapping(m, idx);
            const fnCode = functionSelections[key] || guessFunctionFromLogic(m.logic);
            const template = functionTemplateForCode(fnCode);
            const inputCp = cpCounter++;
            const outputCp = cpCounter++;
            const sourceCp = sourceIdByKey[m.source] ?? inputCp - 10000; // fallback unique
            const targetCp = targetIdByKey[m.target] ?? outputCp + 10000; // fallback unique
            const label = escapeXml(m.logic || fnCode || 'mapping');

            functionsXml.push(`
        <Function ID="${fnId}" Name="Auto_${fnId}" Template="${template}">
            <Properties Category="Settings">
                <Property Name="Parameters/logic">${label}</Property>
            </Properties>
            <ConnectionPoints>
                <ConnectionPoint ID="${inputCp}" FP="A" Pos="0" Name="value1"/>
                <ConnectionPoint ID="${outputCp}" FP="X" Pos="0" Name="result1"/>
            </ConnectionPoints>
        </Function>`.trim());

            connectorsXml.push(`<Connector OutputCP="${sourceCp}" InputCP="${inputCp}"/>`);
            connectorsXml.push(`<Connector OutputCP="${outputCp}" InputCP="${targetCp}"/>`);
        });

        const sourcesXml = uniqueSources.map(s => `                <ConnectionPoint ID="${s.id}" Path="${escapeXml(s.key)}"/>`).join('\n');
        const targetsXml = uniqueTargets.map(t => `                <ConnectionPoint ID="${t.id}" Path="${escapeXml(t.key)}"/>`).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<Map Version="3" ModelVersion="4" ModelRevision="1">
    <Properties Category="Summary">
        <Property Name="Author">MappingStudio</Property>
        <Property Name="Company">Generated</Property>
        <Property Name="Status">Draft</Property>
        <Property Name="Project">${escapeXml(currentProject?.name || 'Project')}</Property>
    </Properties>
    <Sources>
        <ExternalStorage ID="1" Type="File.ECS">
            <Properties>
                <Property Name="Name">Source</Property>
                <Property Name="Location">/source-guideline-placeholder.ecs</Property>
            </Properties>
            <ConnectionPoints>
${sourcesXml || '                <!-- No source fields found -->'}
            </ConnectionPoints>
        </ExternalStorage>
    </Sources>
    <Targets>
        <ExternalStorage ID="2" Type="File.ECS">
            <Properties>
                <Property Name="Name">Target</Property>
                <Property Name="Location">/target-guideline-placeholder.ecs</Property>
            </Properties>
            <ConnectionPoints>
${targetsXml || '                <!-- No target fields found -->'}
            </ConnectionPoints>
            <ReverseConnectionPoints/>
        </ExternalStorage>
    </Targets>
    <Functions>
${functionsXml.join('\n')}
    </Functions>
    <Connectors>
        ${connectorsXml.join('\n        ')}
    </Connectors>
</Map>`;
    };

    const generateEmsStub = (rows) => {
        const xml = generateEmsXml(rows);
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject?.name || 'mapping'}-ems.xml`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleGenerateMap = () => {
        if (!currentProject || !mappings || mappings.length === 0) {
            message.info('No mappings to generate.');
            return;
        }
        const alreadyVisible = functionColumnVisible;
        setFunctionColumnVisible(true);
        setFunctionSelections(prev => {
            const next = { ...prev };
            mappings.forEach((m, idx) => {
                const key = rowKeyForMapping(m, idx);
                if (!next[key]) {
                    next[key] = guessFunctionFromLogic(m.logic);
                }
            });
            return next;
        });
        if (!alreadyVisible) {
            message.success('Function column added. Review or change functions, then click Generate EMS again to export.');
        } else {
            generateEmsStub(mappings);
            message.success('EMS stub generated with selected functions.');
        }
    };

    const fetchWithAuth = useCallback(async (url, options = {}) => {
        const res = await fetch(url, {
            ...options,
            headers: { ...(options.headers || {}), 'X-Access-Key': accessKey }
        });
        if (res.status === 401) {
            setAccessKey('');
            try { sessionStorage.removeItem(ACCESS_KEY_STORAGE); } catch (_) {}
        }
        return res;
    }, [accessKey]);

    // Load function catalog once we have fetchWithAuth
    useEffect(() => {
        const loadFunctions = async () => {
            try {
                const res = await fetchWithAuth(`${API}/functions`);
                if (!res.ok) throw new Error('Failed to load functions');
                const data = await res.json();
                setFunctionOptions(data.map(f => ({ value: f.id, label: f.label, description: f.description })));
            } catch (_) {
                setFunctionOptions([
                    { value: 'copy', label: 'Copy (default)' },
                    { value: 'trim_upper', label: 'Copy with trim + uppercase' },
                    { value: 'convert_date', label: 'Convert date format' },
                    { value: 'sum_amounts', label: 'Sum / accumulate amounts' },
                    { value: 'jsonata', label: 'JSONata expression' },
                    { value: 'qwasp', label: 'QWASP expression' },
                    { value: 'custom_js', label: 'Custom JavaScript (manual)' },
                ]);
            }
        };
        loadFunctions();
    }, [fetchWithAuth]);

    // Load projects and schema list when on dashboard
    useEffect(() => {
        if (!accessKey || view !== 'dashboard') return;
        let cancelled = false;
        fetchWithAuth(`${API}/projects`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (cancelled) return;
                const list = Array.isArray(data) ? data : [];
                setProjects(list.map(p => ({ ...p, status: p.status || 'Spec creation in progress', updated: p.updated || 'Just now', coverage: p.coverage ?? 0 })));
            })
            .catch(() => { if (!cancelled) setProjects([]); });
        return () => { cancelled = true; };
    }, [accessKey, fetchWithAuth, view]);

    // Load schema list when authenticated (for project create and tree resolution)
    useEffect(() => {
        if (!accessKey) return;
        let cancelled = false;
        fetchWithAuth(`${API}/schemas`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (cancelled) return;
                setSchemaList(Array.isArray(data) ? data : []);
            })
            .catch(() => { if (!cancelled) setSchemaList([]); });
        return () => { cancelled = true; };
    }, [accessKey, fetchWithAuth]);

    const handleCreateProject = async (newProject) => {
        try {
            const res = await fetchWithAuth(`${API}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProject.name, sourceSchema: newProject.sourceSchema, targetSchema: newProject.targetSchema, status: 'Spec creation in progress', updated: 'Just now' })
            });
            if (!res.ok) throw new Error('Create failed');
            const saved = await res.json();
            const project = { ...saved, status: saved.status || 'Spec creation in progress', coverage: saved.coverage ?? 0 };
            setProjects(prev => [project, ...prev]);
            setCurrentProject(project);
            setMappings([]);
            setSelectedLedgerMapping(null);
            setSelectedSourceNode(null);
            setSelectedTargetNode(null);
            setAwaitingSourcePickForEdit(false);
            setAwaitingTargetPickForEdit(false);
            setView('workspace');
        } catch (e) {
            console.error(e);
            message.error('Failed to create project. Is the backend running?');
        }
    };

    const handleDeleteProject = async (projectId, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await fetchWithAuth(`${API}/projects/${projectId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setProjects(prev => prev.filter(p => p.id !== projectId));
            if (currentProject?.id === projectId) {
                setCurrentProject(null);
                setMappings([]);
                setView('dashboard');
            }
            message.success('Project removed');
        } catch (err) {
            console.error(err);
            message.error('Failed to delete project. Is the backend running?');
        }
    };

    const handleMarkReadyForDevelopment = async () => {
        if (!currentProject?.id) {
            message.error('No project selected');
            return;
        }
        try {
            const res = await fetchWithAuth(`${API}/projects/${currentProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Ready for Development', updated: 'Just now' })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `Update failed (${res.status})`);
            }
            const updated = await res.json();
            setCurrentProject(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            message.success('Project marked Ready for Development – Dev can now take it.');
        } catch (err) {
            console.error(err);
            message.error(err.message || 'Failed to update project. Is the backend running?');
        }
    };

    // Format label -> schema type (for resolving "XML / XSD" etc. to uploaded custom schema)
    const FORMAT_TO_TYPE = { 'XML / XSD': 'xsd', 'JSON Schema': 'json_sample', 'CSV / Delimited': 'csv_sample', 'DFF (Data Field File)': 'csv_sample', 'PFF (Position Fixed File)': 'csv_sample' };
    // Load schema trees: resolve name to id (schemaList or EDI key), fetch GET /api/schemas/{id}
    useEffect(() => {
        const sourceSchema = currentProject?.sourceSchema;
        const targetSchema = currentProject?.targetSchema;
        const names = [sourceSchema, targetSchema].filter(Boolean);
        const getId = (name) => {
            const byName = schemaList?.find(s => s.name === name)?.id;
            if (byName) return byName;
            if (EDI_SCHEMA_API_KEYS[name]) return EDI_SCHEMA_API_KEYS[name];
            // Format label (e.g. "XML / XSD"): use first custom schema of matching type so tree loads
            const type = FORMAT_TO_TYPE[name];
            if (type && schemaList?.length) {
                const custom = schemaList.find(s => s.kind === 'custom' && s.type === type);
                if (custom) return custom.id;
            }
            return undefined;
        };
        const toLoad = names.filter(n => {
            const id = getId(n);
            return id && !schemaTrees[n];
        });
        if (!accessKey || toLoad.length === 0) return;
        let cancelled = false;
        Promise.all(toLoad.map(name =>
            fetchWithAuth(`${API}/schemas/${encodeURIComponent(getId(name))}`)
                .then(r => r.ok ? r.json() : null)
                .then(data => ({ name, tree: data?.tree }))
        )).then(results => {
            if (cancelled) return;
            setSchemaTrees(prev => {
                const next = { ...prev };
                results.forEach(({ name, tree }) => { if (tree) next[name] = tree; });
                return next;
            });
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [currentProject?.sourceSchema, currentProject?.targetSchema, accessKey, schemaTrees, schemaList, fetchWithAuth]);

    const getTreeForSchema = useCallback((schemaName) => {
        if (!schemaName) return [];
        return schemaTrees[schemaName] ?? SCHEMAS[schemaName] ?? [];
    }, [schemaTrees]);

    const [expandedSourceKeys, setExpandedSourceKeys] = useState([]);
    const [expandedTargetKeys, setExpandedTargetKeys] = useState([]);
    const getRootKeys = useCallback((tree) => (tree || []).map(n => n.key), []);

    const mappedSourceTitles = useMemo(() => new Set((mappings || []).map(m => m.source).filter(Boolean)), [mappings]);
    const mappedTargetTitles = useMemo(() => new Set((mappings || []).map(m => m.target).filter(Boolean)), [mappings]);

    const getMatchingKeys = useCallback((treeData, query) => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return [];
        const keys = [];
        const walk = (nodes) => {
            if (!Array.isArray(nodes)) return;
            nodes.forEach((n) => {
                const title = (n.title || '').toString().toLowerCase();
                const key = (n.key || '').toString().toLowerCase();
                if (title.includes(q) || key.includes(q)) keys.push(n.key);
                if (n.children) walk(n.children);
            });
        };
        walk(treeData || []);
        return keys;
    }, []);

    // Leaf-only matches for quick select (mapping uses leaves only)
    const getMatchingNodes = useCallback((treeData, query) => {
        const q = (query || '').trim().toLowerCase();
        if (!q) return [];
        const out = [];
        const walk = (nodes) => {
            if (!Array.isArray(nodes)) return;
            nodes.forEach((n) => {
                const title = (n.title || '').toString().toLowerCase();
                const key = (n.key || '').toString().toLowerCase();
                const match = title.includes(q) || key.includes(q);
                if (n.isLeaf && match) out.push(n);
                if (n.children) walk(n.children);
            });
        };
        walk(treeData || []);
        return out;
    }, []);

    // Debounce schema search (fast 150ms) and trigger highlight (fade out after 1.5s)
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSourceSearch(sourceSchemaSearch), 150);
        return () => clearTimeout(t);
    }, [sourceSchemaSearch]);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedTargetSearch(targetSchemaSearch), 150);
        return () => clearTimeout(t);
    }, [targetSchemaSearch]);
    useEffect(() => {
        const tree = getTreeForSchema(currentProject?.sourceSchema) || [];
        const q = (debouncedSourceSearch || '').trim();
        if (!q) {
            setHighlightedSourceKeys([]);
            return;
        }
        const keys = getMatchingKeys(tree, q);
        setHighlightedSourceKeys(keys);
        const clear = setTimeout(() => setHighlightedSourceKeys([]), 1500);
        return () => clearTimeout(clear);
    }, [debouncedSourceSearch, currentProject?.sourceSchema, getMatchingKeys]);
    useEffect(() => {
        const tree = getTreeForSchema(currentProject?.targetSchema) || [];
        const q = (debouncedTargetSearch || '').trim();
        if (!q) {
            setHighlightedTargetKeys([]);
            return;
        }
        const keys = getMatchingKeys(tree, q);
        setHighlightedTargetKeys(keys);
        const clear = setTimeout(() => setHighlightedTargetKeys([]), 1500);
        return () => clearTimeout(clear);
    }, [debouncedTargetSearch, currentProject?.targetSchema, getMatchingKeys]);

    const sourceTreeData = useMemo(() => getTreeForSchema(currentProject?.sourceSchema) || [], [currentProject?.sourceSchema, getTreeForSchema]);
    const targetTreeData = useMemo(() => getTreeForSchema(currentProject?.targetSchema) || [], [currentProject?.targetSchema, getTreeForSchema]);
    useEffect(() => { setExpandedSourceKeys(getRootKeys(sourceTreeData)); }, [currentProject?.sourceSchema, getRootKeys, sourceTreeData]);
    useEffect(() => { setExpandedTargetKeys(getRootKeys(targetTreeData)); }, [currentProject?.targetSchema, getRootKeys, targetTreeData]);

    const sourceMatchNodes = useMemo(() => {
        const tree = getTreeForSchema(currentProject?.sourceSchema) || [];
        return getMatchingNodes(tree, debouncedSourceSearch);
    }, [currentProject?.sourceSchema, debouncedSourceSearch, getTreeForSchema, getMatchingNodes]);

    const targetMatchNodes = useMemo(() => {
        const tree = getTreeForSchema(currentProject?.targetSchema) || [];
        return getMatchingNodes(tree, debouncedTargetSearch);
    }, [currentProject?.targetSchema, debouncedTargetSearch, getTreeForSchema, getMatchingNodes]);

    const scrollToNodeByKey = useCallback((treeAttr, key) => {
        const el = document.querySelector(`[data-tree="${treeAttr}"] [data-node-key="${key}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const renderSchemaTreeTitle = useCallback((node, mappedTitles, selectedTitle, highlightedKeys) => {
        const hasChildren = (node.children?.length ?? 0) > 0;
        const isParent = hasChildren || node.isLeaf === false;
        const parentCls = 'font-semibold text-[#0F172A] leading-tight text-sm';
        const childCls = 'text-[#475569] font-mono text-xs leading-relaxed';
        const baseCls = isParent ? parentCls : childCls;
        const isMapped = mappedTitles && mappedTitles.has(node.title);
        const isSelected = selectedTitle != null && node.title === selectedTitle;
        const isHighlighted = highlightedKeys && highlightedKeys.includes(node.key);
        const Icon = isParent ? ApartmentOutlined : FileOutlined;
        const iconCls = isParent ? 'text-slate-500 shrink-0' : 'text-slate-400 shrink-0 text-[10px]';
        const titleSpan = (className, content) => (
            <span className={className} data-node-title={node.title} data-node-key={node.key} data-node-parent={isParent ? '1' : '0'}>
                {content}
            </span>
        );
        if (isMapped || isSelected) {
            const selectedStyle = isSelected ? 'ring-2 ring-red-300 ring-offset-1 bg-white border border-red-200 rounded' : '';
            return titleSpan(
                `flex items-center gap-1.5 w-full min-w-0 rounded px-0.5 -mx-0.5 ${isSelected ? selectedStyle : ''} ${isHighlighted ? 'schema-search-hit' : ''} ${isParent ? 'schema-tree-parent' : 'schema-tree-leaf'}`,
                <>
                    {isMapped && <CheckCircleFilled className="text-emerald-500 text-xs shrink-0 flex-shrink-0" aria-hidden />}
                    <Icon className={iconCls} aria-hidden />
                    <span className={`${baseCls} ${isMapped && !isSelected ? 'bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 border border-emerald-200/80' : ''} ${isSelected ? 'text-[#0F172A] font-semibold' : ''} truncate max-w-full`}>{node.title}</span>
                </>
            );
        }
        return titleSpan(
            `flex items-center gap-1.5 w-full min-w-0 ${baseCls} ${isHighlighted ? 'schema-search-hit' : ''} ${isParent ? 'schema-tree-parent' : 'schema-tree-leaf'}`,
            <>
                <Icon className={iconCls} aria-hidden />
                <span className="truncate max-w-full">{node.title}</span>
            </>
        );
    }, []);

    const renderSourceTreeTitle = useCallback((node) => renderSchemaTreeTitle(node, mappedSourceTitles, selectedLedgerMapping?.source, highlightedSourceKeys), [renderSchemaTreeTitle, mappedSourceTitles, selectedLedgerMapping?.source, highlightedSourceKeys]);
    const renderTargetTreeTitle = useCallback((node) => renderSchemaTreeTitle(node, mappedTargetTitles, selectedLedgerMapping?.target, highlightedTargetKeys), [renderSchemaTreeTitle, mappedTargetTitles, selectedLedgerMapping?.target, highlightedTargetKeys]);

    // When a ledger row is selected, scroll source/target tree nodes into view
    useEffect(() => {
        if (!selectedLedgerMapping) return;
        const scrollToNode = (treeDataAttr, title) => {
            if (!title) return;
            const container = document.querySelector(`[data-tree="${treeDataAttr}"]`);
            if (!container) return;
            const nodes = container.querySelectorAll('[data-node-title]');
            const el = Array.from(nodes).find(n => n.getAttribute('data-node-title') === title);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        };
        const t = setTimeout(() => {
            scrollToNode('source', selectedLedgerMapping.source);
            scrollToNode('target', selectedLedgerMapping.target);
        }, 100);
        return () => clearTimeout(t);
    }, [selectedLedgerMapping]);

    // Load mappings when opening a project (BA workspace or Dev project view)
    useEffect(() => {
        const needMappings = (view === 'workspace' && userRole === 'ba') || view === 'dev-project' || view === 'client-project';
        if (!needMappings || !currentProject?.id || !accessKey) return;
        let cancelled = false;
        fetchWithAuth(`${API}/mappings/project/${currentProject.id}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => { if (!cancelled) setMappings(Array.isArray(data) ? data : []); })
            .catch(() => { if (!cancelled) setMappings([]); });
        return () => { cancelled = true; };
    }, [view, userRole, currentProject?.id, accessKey, fetchWithAuth]);

    const isWorkspaceWithPanels = userRole === 'ba' && view === 'workspace' && !!currentProject;

    const isDashboardView = view === 'dashboard' && !isWorkspaceWithPanels;

    const handleExportExcel = useCallback(async () => {
        if (!currentProject?.id) { message.error("No project selected"); return; }
        const res = await fetchWithAuth(`${API}/export/excel/project/${currentProject.id}`);
        if (res.status === 401) return;
        if (!res.ok) { message.error('Export failed'); return; }
        try {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mapping-${currentProject.name || currentProject.id}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            message.success('Download started');
        } catch (e) {
            message.error('Download failed');
        }
    }, [currentProject?.id, currentProject?.name, fetchWithAuth]);

    const handleLogout = useCallback(() => {
        setAccessKey('');
        setView('dashboard');
        setCurrentProject(null);
        setMappings([]);
        try {
            sessionStorage.removeItem(ACCESS_KEY_STORAGE);
            localStorage.removeItem(ROLE_KEY);
        } catch (_) {}
    }, []);

    if (!accessKey) {
        return (
            <ConfigProvider theme={{ token: THEME_TOKENS }}>
                <LoginScreen apiBase={API} onSuccess={(key, role) => { setAccessKey(key); setUserRole(role || 'ba'); setView('dashboard'); }} />
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider theme={{ token: THEME_TOKENS }}>
            <div
                ref={mainWrapperRef}
                className={STYLES.mainWrapper}
                style={isDashboardView ? { width: '100%', minWidth: '100%' } : undefined}
            >
                {isWorkspaceWithPanels && (
                    <>
                        <aside
                            style={{
                                flex: `0 0 ${sourcePanelWidth}px`,
                                width: sourcePanelWidth,
                                minWidth: MIN_PANEL,
                                maxWidth: MAX_PANEL,
                                transition: isResizing ? 'none' : 'width 200ms ease-out'
                            }}
                            className={`${STYLES.sidebar} overflow-hidden shrink-0`}
                        >
                            <div className={STYLES.panelTitle}>
                                <span className="flex items-center gap-2 truncate"><DatabaseOutlined className="text-[#64748B] shrink-0" /> SOURCE: {currentProject?.sourceSchema}</span>
                            </div>
                            <div className="px-3 pt-2 pb-1 border-b border-[rgba(0,0,0,0.04)] shrink-0 relative">
                                <Input
                                    placeholder="Search source…"
                                    value={sourceSchemaSearch}
                                    onChange={e => setSourceSchemaSearch(e.target.value)}
                                    allowClear
                                    size="small"
                                    prefix={<SearchOutlined className="text-[#94A3B8] text-xs" />}
                                    className="text-xs rounded-lg border-[rgba(0,0,0,0.06)]"
                                />
                                {sourceSchemaSearch.trim() && sourceMatchNodes.length > 0 && (
                                    <div className="absolute left-2 right-2 top-full mt-0.5 z-50 max-h-48 overflow-y-auto rounded-lg border border-[rgba(0,0,0,0.08)] bg-white shadow-lg custom-scrollbar py-0.5">
                                        {sourceMatchNodes.map((n) => (
                                            <button
                                                key={n.key}
                                                type="button"
                                                className="w-full text-left px-3 py-1.5 text-xs font-mono text-[#334155] hover:bg-slate-50 border-0 cursor-pointer truncate block"
                                                onClick={() => {
                                                    setSelectedSourceNode(n);
                                                    setSourceSchemaSearch('');
                                                    setTimeout(() => scrollToNodeByKey('source', n.key), 80);
                                                }}
                                            >
                                                {n.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar" data-tree="source">
                                <Tree
                                    showLine={{ showLeafIcon: false }}
                                    blockNode
                                    expandedKeys={expandedSourceKeys}
                                    onExpand={(keys) => setExpandedSourceKeys(keys)}
                                    treeData={sourceTreeData}
                                    selectedKeys={selectedSourceNode ? [selectedSourceNode.key] : []}
                                    onSelect={(_, {node}) => {
                                        if (!node.isLeaf) return;
                                        if (awaitingSourcePickForEdit && selectedLedgerMapping) {
                                            setSelectedLedgerMapping(prev => prev ? { ...prev, source: node.title } : null);
                                            setAwaitingSourcePickForEdit(false);
                                            message.success('Source updated – click Save to apply');
                                        }
                                        setSelectedSourceNode(node);
                                    }}
                                    className="premium-tree premium-tree-vertical"
                                    titleRender={renderSourceTreeTitle}
                                />
                            </div>
                        </aside>
                        <div
                            role="separator"
                            aria-label="Resize source panel"
                            onPointerDown={startResizeSource}
                            className="h-full w-4 flex-shrink-0 cursor-col-resize hover:bg-emerald-100 flex items-center justify-center select-none border-r border-[rgba(0,0,0,0.06)]"
                            style={{ touchAction: 'none', zIndex: 30 }}
                        >
                            <div className="w-1 h-20 rounded-full bg-slate-300 pointer-events-none" />
                        </div>
                    </>
                )}

                <main
                    className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white min-h-0"
                    style={isDashboardView ? { flex: '1 1 0%', width: '100%', minWidth: '100%' } : { flex: '1 1 0%' }}
                >
                    <Header className={STYLES.premiumHeader}>
                        <div className={`flex items-center justify-start ${view === 'dashboard' ? 'flex-1 min-w-0' : 'shrink-0'}`} style={view !== 'dashboard' ? { minWidth: '6.5rem' } : undefined}>
                            {(view === 'wizard' || view === 'workspace' || view === 'dev-project' || view === 'client-project') && (
                                <button type="button" className="group flex items-center rounded-md text-[#64748B] hover:text-[#10B981] hover:bg-slate-50/80 p-2 transition-colors w-full min-w-0" onClick={() => { setView('dashboard'); if (view !== 'wizard') { setCurrentProject(null); setMappings([]); } }} aria-label="Back">
                                    <ArrowLeftOutlined className="text-lg shrink-0" />
                                    <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium text-[#334155]">Back</span>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex justify-center items-center px-2 shrink-0">
                            <Space size="large" className="flex-nowrap">
                                <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setView('dashboard')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView('dashboard')}>
                                    <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center shrink-0">
                                        <ThunderboltOutlined className="text-white text-lg" />
                                    </div>
                                    <span className="font-extrabold text-[1.35rem] tracking-tight text-[#0F172A] whitespace-nowrap header-brand">MappingStudio</span>
                                </div>
                                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-2 py-1 rounded-md bg-slate-100/80 border border-[rgba(0,0,0,0.04)]">
                                    {userRole === 'ba' ? 'BA' : userRole === 'dev' ? 'Dev' : 'Client'}
                                </span>
                            </Space>
                        </div>
                        <div className={`flex items-center justify-end flex-nowrap ${view === 'dashboard' ? 'flex-1 min-w-0' : 'shrink-0'}`} style={{ gap: 0 }}>
                            {userRole === 'ba' && view === 'workspace' && (
                                <>
                                    <Tooltip title="Export Spec">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md text-[#64748B] hover:text-[#10B981] hover:bg-slate-50/80 p-2 transition-colors" onClick={handleExportExcel} aria-label="Export Spec">
                                            <FileExcelOutlined className="text-lg shrink-0 text-[#64748B] group-hover:text-[#10B981]" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5.5rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium text-[#334155]">Export Spec</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Publish Spec">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md text-[#64748B] hover:text-[#10B981] hover:bg-slate-50/80 p-2 transition-colors" onClick={() => message.info('Publish to SharePoint – coming soon')} aria-label="Publish Spec">
                                            <CloudUploadOutlined className="text-lg shrink-0 text-[#64748B] group-hover:text-[#10B981]" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5.5rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Publish Spec</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Ready for Development">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md bg-emerald-500 text-white hover:bg-emerald-600 p-2 transition-colors font-bold text-sm" onClick={() => handleMarkReadyForDevelopment()} aria-label="Ready for Development">
                                            <CheckCircleFilled className="text-lg shrink-0 text-white" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[10rem] transition-[max-width] duration-300 ease-out ml-1.5">Ready for Development</span>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                            {userRole === 'dev' && view === 'dev-project' && (
                                <>
                                    <Tooltip title="Download Excel">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md text-[#64748B] hover:text-[#10B981] hover:bg-slate-50/80 p-2 transition-colors" onClick={handleExportExcel} aria-label="Download Excel">
                                            <FileExcelOutlined className="text-lg shrink-0 text-[#64748B] group-hover:text-[#10B981]" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[6rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Download Excel</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Generate EMS">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md bg-emerald-500 text-white hover:bg-emerald-600 p-2 transition-colors font-bold text-sm" onClick={handleGenerateMap} aria-label="Generate EMS">
                                            <ToolOutlined className="text-lg shrink-0 text-white" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5.5rem] transition-[max-width] duration-300 ease-out ml-1.5">Generate EMS</span>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                            <Tooltip title="Log out">
                                <button type="button" className="group flex items-center overflow-hidden rounded-md text-[#64748B] hover:text-red-500 hover:bg-slate-50/80 p-2 transition-colors ml-1" onClick={handleLogout} aria-label="Log out">
                                    <LogoutOutlined className="text-lg shrink-0" />
                                    <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[4rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Log out</span>
                                </button>
                            </Tooltip>
                        </div>
                    </Header>

                    <div
                        className="flex-1 min-w-0 min-h-0 overflow-hidden relative flex flex-col"
                        style={{ width: '100%', minWidth: 0 }}
                    >
                        {view === 'dashboard' && userRole === 'client' && (
                            <ClientDashboard
                                projects={projects}
                                onSelect={(p) => {
                                    setCurrentProject(p);
                                    setMappings([]);
                                    setView('client-project');
                                }}
                                fetchWithAuth={fetchWithAuth}
                            />
                        )}
                        {view === 'dashboard' && (userRole === 'ba' || userRole === 'dev') && (
                            <Dashboard
                                projects={projects}
                                userRole={userRole}
                                onNew={() => setView('wizard')}
                                onSelect={(p) => {
                                    setCurrentProject(p);
                                    setSelectedLedgerMapping(null);
                                    setSelectedSourceNode(null);
                                    setSelectedTargetNode(null);
                                    setAwaitingSourcePickForEdit(false);
                                    setAwaitingTargetPickForEdit(false);
                                    setView(userRole === 'dev' ? 'dev-project' : 'workspace');
                                }}
                                onDelete={handleDeleteProject}
                                fetchWithAuth={fetchWithAuth}
                            />
                        )}
                        {view === 'wizard' && userRole === 'ba' && (
                            <ProjectWizard
                                onCancel={() => setView('dashboard')}
                                onFinish={handleCreateProject}
                                schemaList={schemaList}
                                setSchemaList={setSchemaList}
                                setSchemaTrees={setSchemaTrees}
                                fetchWithAuth={fetchWithAuth}
                            />
                        )}
                        {view === 'workspace' && userRole === 'ba' && (
                            currentProject ? (
                                <MappingWorkspace
                                    project={currentProject}
                                    mappings={mappings}
                                    setMappings={setMappings}
                                    selectedSource={selectedSourceNode}
                                    setSelectedSource={setSelectedSourceNode}
                                    selectedTarget={selectedTargetNode}
                                    setSelectedTarget={setSelectedTargetNode}
                                    selectedLedgerMapping={selectedLedgerMapping}
                                    setSelectedLedgerMapping={setSelectedLedgerMapping}
                                    awaitingSourcePickForEdit={awaitingSourcePickForEdit}
                                    setAwaitingSourcePickForEdit={setAwaitingSourcePickForEdit}
                                    awaitingTargetPickForEdit={awaitingTargetPickForEdit}
                                    setAwaitingTargetPickForEdit={setAwaitingTargetPickForEdit}
                                    fetchWithAuth={fetchWithAuth}
                                    onBack={() => { setView('dashboard'); setCurrentProject(null); setSelectedLedgerMapping(null); setAwaitingSourcePickForEdit(false); setAwaitingTargetPickForEdit(false); }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                                    <Empty description="No project selected" />
                                    <Button type="primary" onClick={() => setView('dashboard')}>Back to Dashboard</Button>
                                </div>
                            )
                        )}
                        {view === 'dev-project' && userRole === 'dev' && (
                            <DevProjectView
                                project={currentProject}
                                mappings={mappings}
                                functionColumnVisible={functionColumnVisible}
                                functionSelections={functionSelections}
                                setFunctionSelections={setFunctionSelections}
                                functionOptions={functionOptions}
                                guessFunctionFromLogic={guessFunctionFromLogic}
                                onGenerateEms={handleGenerateMap}
                                onBack={() => { setCurrentProject(null); setView('dashboard'); }}
                            />
                        )}
                        {view === 'client-project' && userRole === 'client' && (
                            <ClientProjectView
                                project={currentProject}
                                mappings={mappings}
                                setMappings={setMappings}
                                onBack={() => { setCurrentProject(null); setView('dashboard'); }}
                                fetchWithAuth={fetchWithAuth}
                            />
                        )}
                        {/* Fallback: BA in dev-project view or any unmatched state -> show dashboard */}
{view === 'dev-project' && userRole === 'ba' && (
                                <Dashboard
                                    projects={projects}
                                    userRole={userRole}
                                    onNew={() => setView('wizard')}
                                    onSelect={(p) => {
                                        setCurrentProject(p);
                                        setSelectedLedgerMapping(null);
                                        setSelectedSourceNode(null);
                                        setSelectedTargetNode(null);
                                        setAwaitingSourcePickForEdit(false);
                                        setAwaitingTargetPickForEdit(false);
                                        setView('workspace');
                                    }}
                                    onDelete={handleDeleteProject}
                                    fetchWithAuth={fetchWithAuth}
                                />
                            )}
                    </div>
                </main>

                {isWorkspaceWithPanels && (
                    <>
                        <div
                            role="separator"
                            aria-label="Resize target panel"
                            onPointerDown={startResizeTarget}
                            className="h-full w-4 flex-shrink-0 cursor-col-resize hover:bg-emerald-100 flex items-center justify-center select-none border-l border-[rgba(0,0,0,0.06)]"
                            style={{ touchAction: 'none', zIndex: 30 }}
                        >
                            <div className="w-1 h-20 rounded-full bg-slate-300 pointer-events-none" />
                        </div>
                        <div
                            style={{
                                flex: `0 0 ${targetPanelWidth}px`,
                                width: targetPanelWidth,
                                minWidth: MIN_PANEL,
                                maxWidth: MAX_PANEL,
                                overflow: 'hidden',
                                transition: isResizing ? 'none' : 'width 200ms ease-out'
                            }}
                            className="flex flex-col h-full border-l border-slate-100 bg-white shrink-0"
                        >
                            <aside className={`${STYLES.sidebar} border-r-0 flex-1 flex flex-col min-w-0 w-full`} style={{ width: '100%' }}>
                                <div className={STYLES.panelTitle}>
                                    <span className="flex items-center gap-2 truncate min-w-0"><DeploymentUnitOutlined className="text-[#64748B] shrink-0" /> TARGET: {currentProject?.targetSchema}</span>
                                </div>
                                <div className="px-3 pt-2 pb-1 border-b border-[rgba(0,0,0,0.04)] shrink-0 relative">
                                    <Input
                                        placeholder="Search target…"
                                        value={targetSchemaSearch}
                                        onChange={e => setTargetSchemaSearch(e.target.value)}
                                        allowClear
                                        size="small"
                                        prefix={<SearchOutlined className="text-[#94A3B8] text-xs" />}
                                        className="text-xs rounded-lg border-[rgba(0,0,0,0.06)]"
                                    />
                                    {targetSchemaSearch.trim() && targetMatchNodes.length > 0 && (
                                        <div className="absolute left-2 right-2 top-full mt-0.5 z-50 max-h-48 overflow-y-auto rounded-lg border border-[rgba(0,0,0,0.08)] bg-white shadow-lg custom-scrollbar py-0.5">
                                            {targetMatchNodes.map((n) => (
                                                <button
                                                    key={n.key}
                                                    type="button"
                                                    className="w-full text-left px-3 py-1.5 text-xs font-mono text-emerald-700 hover:bg-emerald-50/80 border-0 cursor-pointer truncate block"
                                                    onClick={() => {
                                                        setSelectedTargetNode(n);
                                                        setTargetSchemaSearch('');
                                                        setTimeout(() => scrollToNodeByKey('target', n.key), 80);
                                                    }}
                                                >
                                                    {n.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar" data-tree="target">
                                    <Tree
                                        showLine={{ showLeafIcon: false }}
                                        blockNode
                                        expandedKeys={expandedTargetKeys}
                                        onExpand={(keys) => setExpandedTargetKeys(keys)}
                                        treeData={targetTreeData}
                                        selectedKeys={selectedTargetNode ? [selectedTargetNode.key] : []}
                                        onSelect={(_, {node}) => {
                                            if (!node.isLeaf) return;
                                            if (awaitingTargetPickForEdit && selectedLedgerMapping) {
                                                setSelectedLedgerMapping(prev => prev ? { ...prev, target: node.title } : null);
                                                setAwaitingTargetPickForEdit(false);
                                                message.success('Target updated – click Save to apply');
                                            }
                                            setSelectedTargetNode(node);
                                        }}
                                        className="premium-tree premium-tree-vertical"
                                        titleRender={renderTargetTreeTitle}
                                    />
                                </div>
                            </aside>
                        </div>
                    </>
                )}
            </div>
        </ConfigProvider>
    );
}

const ENROLLMENT_834_NAME = 'Enrollment 834';

function ClientDashboard({ projects, onSelect, fetchWithAuth }) {
    const enrollment834 = useMemo(() => projects.filter(p => p.name && (p.name.toLowerCase().includes('834') || p.name.toLowerCase().includes('enrollment'))), [projects]);
    const otherProjects = useMemo(() => projects.filter(p => !enrollment834.includes(p)), [projects, enrollment834]);
    return (
        <div className="overflow-y-auto custom-scrollbar" style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="px-6 py-10 box-border w-full max-w-3xl mx-auto">
                <Title level={3} className="!mb-1 text-[#0F172A]">Client view</Title>
                <Text className="text-sm text-[#64748B] block mb-8">Select a project to update business logic and add your comments.</Text>
                {enrollment834.length > 0 && (
                    <div className="mb-8">
                        <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-4">Enrollment 834 (template)</Text>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {enrollment834.map(p => (
                                <Card key={p.id} hoverable className={STYLES.glassCard} bodyStyle={{ padding: '20px' }} onClick={() => onSelect(p)}>
                                    <div className="font-semibold text-[#0F172A] mb-1">{p.name}</div>
                                    <Text className="text-xs text-[#64748B]">{p.sourceSchema} → {p.targetSchema}</Text>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
                <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-4">All projects</Text>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherProjects.length === 0 && enrollment834.length === 0 ? (
                        <Card className={STYLES.glassCard} bodyStyle={{ padding: '24px' }}>
                            <Empty description="No projects yet. Ask your BA to create an Enrollment 834 or other project." />
                        </Card>
                    ) : (
                        otherProjects.map(p => (
                            <Card key={p.id} hoverable className={STYLES.glassCard} bodyStyle={{ padding: '20px' }} onClick={() => onSelect(p)}>
                                <div className="font-semibold text-[#0F172A] mb-1">{p.name}</div>
                                <Text className="text-xs text-[#64748B]">{p.sourceSchema} → {p.targetSchema}</Text>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function ClientProjectView({ project, mappings, setMappings, onBack, fetchWithAuth }) {
    const [savingId, setSavingId] = useState(null);
    const saveRow = useCallback(async (record, updates) => {
        if (!record.id) return;
        setSavingId(record.id);
        try {
            const res = await fetchWithAuth(`${API}/mappings/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Save failed');
            const updated = await res.json();
            setMappings(mappings.map(m => m.id === record.id ? updated : m));
            message.success('Saved');
        } catch (e) {
            message.error('Failed to save');
        } finally {
            setSavingId(null);
        }
    }, [fetchWithAuth, mappings, setMappings]);
    const columns = [
        { title: 'Source Field', dataIndex: 'source', key: 'source', render: t => <span className="font-mono text-xs text-[#334155]">{t ?? '—'}</span> },
        {
            title: 'Business Logic',
            dataIndex: 'logic',
            key: 'logic',
            render: (val, record) => (
                <Input.TextArea
                                    size="small"
                                    value={val ?? ''}
                                    onChange={e => setMappings(mappings.map(m => m.id === record.id ? { ...m, logic: e.target.value } : m))}
                                    onBlur={e => { const v = e.target.value; if (record.id && (v !== (record.logic ?? ''))) saveRow(record, { logic: v }); }}
                                    placeholder="Business logic"
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                    className="text-xs"
                                />
            )
        },
        { title: 'Target Field', dataIndex: 'target', key: 'target', render: t => <span className="font-mono text-xs text-emerald-600">{t ?? '—'}</span> },
        {
            title: 'Your comments (client)',
            dataIndex: 'clientComments',
            key: 'clientComments',
            render: (val, record) => (
                <Input.TextArea
                                    size="small"
                                    value={val ?? ''}
                                    onChange={e => setMappings(mappings.map(m => m.id === record.id ? { ...m, clientComments: e.target.value } : m))}
                                    onBlur={e => { const v = e.target.value; if (record.id && (v !== (record.clientComments ?? ''))) saveRow(record, { clientComments: v }); }}
                                    placeholder="Add your comments"
                                    autoSize={{ minRows: 1, maxRows: 2 }}
                                    className="text-xs"
                                />
            )
        },
        {
            title: '',
            width: 72,
            render: (_, record) => record.id && savingId === record.id ? <Spin size="small" /> : null
        }
    ];
    return (
        <Content className="p-10 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-6">
                <Button type="text" onClick={onBack} className="text-[#64748B] hover:text-[#10B981]">← Back to projects</Button>
                <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-8 bg-slate-50/20">
                    <Title level={4} className="m-0 mb-2 text-[#0F172A]">{project?.name ?? 'Project'}</Title>
                    <Text type="secondary" className="text-sm">{project?.sourceSchema} → {project?.targetSchema}</Text>
                </div>
                <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl overflow-hidden bg-slate-50/20">
                    <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.04)] bg-slate-50/50">
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.12em]">Update business logic and your comments</span>
                    </div>
                    <Table
                        dataSource={mappings}
                        columns={columns}
                        rowKey={r => r.id ?? r.source + '-' + r.target}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: <div className="py-10 text-[#64748B] text-xs">No mapping rows. BA will add mappings for you to review.</div> }}
                        className="studio-table"
                    />
                </div>
            </div>
        </Content>
    );
}

function Dashboard({ projects, userRole, onNew, onSelect, onDelete, fetchWithAuth }) {
    const isDev = userRole === 'dev';
    const readyForDevList = projects.filter(p => p.status === 'Ready for Development');
    const inProgressList = projects.filter(p => p.status !== 'Ready for Development');
    const [trainingModalOpen, setTrainingModalOpen] = useState(false);
    const [trainingFile, setTrainingFile] = useState(null);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [trainingResult, setTrainingResult] = useState(null);

    const renderProjectCard = (p) => {
        const readyForDev = p.status === 'Ready for Development';
        const cardClick = () => {
            if (isDev && !readyForDev) {
                message.info('Spec creation in progress – BA must mark as Ready for Development first.');
                return;
            }
            onSelect(p);
        };
        return (
            <Card
                key={p.id}
                hoverable
                className={`${STYLES.glassCard} ${isDev && !readyForDev ? 'opacity-75' : ''}`}
                bodyStyle={{ padding: '24px' }}
                onClick={cardClick}
            >
                <div className="flex justify-between items-start mb-4">
                    <Title level={4} className="m-0 text-[#0F172A] tracking-tight flex-1 min-w-0 pr-2">{p.name}</Title>
                    <div className="flex items-center gap-1 shrink-0">
                        {!isDev && (
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined className="text-[#94A3B8] hover:text-red-400" />}
                                className="text-[#64748B]"
                                onClick={(e) => onDelete(p.id, e)}
                                aria-label="Delete project"
                            />
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-6">
                    <Tag className="m-0 bg-slate-100/80 border-[rgba(0,0,0,0.04)] text-[#64748B] font-mono text-[10px]">{p.sourceSchema}</Tag>
                    <ArrowRightOutlined className="text-[#94A3B8] text-[10px]" />
                    <Tag className="m-0 bg-emerald-50 border-emerald-100 text-emerald-600 font-mono text-[10px]">{p.targetSchema}</Tag>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">
                    <span>Coverage</span>
                    <span>{p.coverage ?? 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.coverage ?? 0}%` }} />
                </div>
            </Card>
        );
    };

    return (
        <div
            className="overflow-y-auto custom-scrollbar"
            style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}
        >
            <div
                className="px-6 py-10 box-border relative"
                style={{ width: '100%', maxWidth: '64rem', marginLeft: 'auto', marginRight: 'auto' }}
            >
                {/* Training: top right corner — human cartoon scholar; character comes out of circle on hover (see docs/MASCOT_AND_ASSETS.md) */}
                <button
                    type="button"
                    onClick={() => { setTrainingModalOpen(true); setTrainingResult(null); setTrainingFile(null); }}
                    className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white/80 hover:bg-slate-50 hover:border-[rgba(0,0,0,0.1)] transition-colors shadow-sm group"
                    aria-label="Open AI Training — Import Excel mapping spec"
                >
                    <span className="train-logo-wrap shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white border-[3px] border-black" aria-hidden>
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 block">
                            {/* White background, black bold circle */}
                            <circle cx="24" cy="24" r="21" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
                            {/* Scholar character (moves up on hover) */}
                            <g className="train-logo-character">
                                {/* Scholar / graduation cap (black) — mortarboard + tassel */}
                                <path d="M12 14 L24 10 L36 14 L24 12 Z" fill="#000000" stroke="#000000" strokeWidth="0.8" />
                                <rect x="18" y="12" width="12" height="2" rx="0.5" fill="#000000" />
                                <circle cx="28" cy="13" r="1" fill="#000000" />
                                <line x1="28" y1="13" x2="30" y2="11" stroke="#000000" strokeWidth="0.8" />
                                {/* Head (human cartoon face) */}
                                <circle cx="24" cy="22" r="7" fill="#F5D0B0" stroke="#000000" strokeWidth="1" />
                                <ellipse cx="21" cy="21" rx="1.8" ry="2" fill="#000000" />
                                <ellipse cx="27" cy="21" rx="1.8" ry="2" fill="#000000" />
                                <circle cx="21.5" cy="21" r="0.5" fill="#FFFFFF" />
                                <circle cx="27.5" cy="21" r="0.5" fill="#FFFFFF" />
                                <path d="M20 25 Q24 28 28 25" stroke="#000000" strokeWidth="1" strokeLinecap="round" fill="none" />
                                {/* Black robe / dress */}
                                <path d="M14 30 L16 28 L24 28 L32 28 L34 30 L34 40 L14 40 Z" fill="#000000" stroke="#000000" strokeWidth="1" />
                                <line x1="24" y1="28" x2="24" y2="40" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.4" />
                            </g>
                        </svg>
                    </span>
                    <span className="relative inline-block min-w-[4rem] sm:min-w-0">
                        <span className="text-xs font-medium text-[#64748B] group-hover:text-[#334155] hidden sm:inline block group-hover:opacity-0 transition-opacity duration-200">Train AI</span>
                        <span className="text-xs font-bold text-emerald-600 hidden sm:inline absolute left-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">lets train</span>
                    </span>
                    <FileExcelOutlined className="text-[#94A3B8] group-hover:text-emerald-500 text-sm shrink-0" />
                </button>

                <div className="mb-10">
                    <div className="text-center mb-6">
                        <Title level={2} className="font-black text-[#0F172A] mb-3">Enterprise Data Orchestration</Title>
                        <Text className="text-[#64748B] text-base block">
                            {isDev ? 'View mapping specs published by BA. Select a project to view Excel in-app or download.' : 'Initialize a mapping project to begin schema synchronization.'}
                        </Text>
                    </div>
                    {!isDev && (
                        <div className="flex justify-center mb-10">
                            <Button
                                type="primary"
                                size="large"
                                icon={<PlusOutlined />}
                                className="h-12 px-8 font-bold rounded-xl shadow-sm"
                                onClick={onNew}
                            >
                                Create Project
                            </Button>
                        </div>
                    )}
                </div>

                {/* Training modal: Import Excel mapping spec */}
                <Modal
                    title={
                        <span className="flex items-center gap-2">
                            <span className="text-xl">🎓</span>
                            <span>AI Training — Import mapping spec</span>
                        </span>
                    }
                    open={trainingModalOpen}
                    onCancel={() => { setTrainingModalOpen(false); setTrainingFile(null); setTrainingResult(null); }}
                    footer={[
                        <Button key="cancel" onClick={() => { setTrainingModalOpen(false); setTrainingFile(null); setTrainingResult(null); }}>Cancel</Button>,
                        <Button
                            key="import"
                            type="primary"
                            icon={<FileExcelOutlined />}
                            loading={trainingLoading}
                            disabled={!trainingFile || !fetchWithAuth}
                            onClick={async () => {
                                if (!trainingFile || !fetchWithAuth) return;
                                setTrainingLoading(true);
                                setTrainingResult(null);
                                try {
                                    const form = new FormData();
                                    form.append('file', trainingFile);
                                    const res = await fetchWithAuth(`${API}/ai/import-spec`, { method: 'POST', body: form });
                                    const raw = await res.text();
                                    let data = {};
                                    try { if (raw) data = JSON.parse(raw); } catch (_) {}
                                    if (!res.ok) {
                                        setTrainingResult({ error: data?.message || data?.error || raw || res.statusText });
                                        return;
                                    }
                                    setTrainingResult({ learned: data.learned ?? 0 });
                                    message.success(`✨ Imported ${data.learned ?? 0} mapping(s) — AI suggestions will improve!`);
                                } catch (e) {
                                    setTrainingResult({ error: e.message || 'Upload failed' });
                                } finally {
                                    setTrainingLoading(false);
                                }
                            }}
                        >
                            Import
                        </Button>
                    ]}
                >
                    <div className="space-y-4">
                        <Text type="secondary" className="text-sm block">
                            Upload an Excel (.xlsx) file with columns: <strong>Source Field</strong>, <strong>Business Logic</strong>, <strong>Target Field</strong>.
                            Each row is recorded so future AI suggestions use your spec — no LLM required.
                        </Text>
                        <div className="flex flex-wrap gap-2 text-xs text-[#64748B] pb-2">
                            <Tag color="blue">📋 Standard columns</Tag>
                            <Tag color="green">🔒 Scanned & secure</Tag>
                            <Tag color="purple">🧠 Learns from you</Tag>
                        </div>
                        <input
                            type="file"
                            accept=".xlsx"
                            className="block w-full text-sm p-2 border border-dashed border-[rgba(0,0,0,0.12)] rounded-lg hover:border-emerald-400 transition-colors"
                            onChange={e => { setTrainingFile(e.target.files?.[0] ?? null); setTrainingResult(null); }}
                        />
                        {trainingResult?.learned != null && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                <span className="text-lg">✅</span>
                                <Text className="text-emerald-700 text-sm m-0">Imported {trainingResult.learned} mapping(s). Suggestions will improve as you map.</Text>
                            </div>
                        )}
                        {trainingResult?.error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                                <span className="text-lg">⚠️</span>
                                <Text type="danger" className="text-sm m-0">{trainingResult.error}</Text>
                            </div>
                        )}
                    </div>
                </Modal>

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[rgba(0,0,0,0.06)] rounded-2xl bg-slate-50/50">
                        <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mb-4 text-[#94A3B8] border border-[rgba(0,0,0,0.04)]">
                            <PlusOutlined style={{ fontSize: 22 }} />
                        </div>
                        <Title level={4} className="text-[#334155] m-0 mb-1">{isDev ? 'No Projects Yet' : 'No Active Projects'}</Title>
                        <Text className="text-[#64748B] text-sm">{isDev ? 'No mapping specs have been published yet.' : 'Create your first mapping project above.'}</Text>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {readyForDevList.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-1 w-8 rounded-full bg-emerald-500" />
                                    <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-emerald-600">Ready for Development</h3>
                                    <Tag color="green" className="m-0 text-[10px] font-bold">{readyForDevList.length}</Tag>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {readyForDevList.map(renderProjectCard)}
                                </div>
                            </section>
                        )}
                        {inProgressList.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-1 w-8 rounded-full bg-slate-300" />
                                    <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-[#64748B]">Spec creation in progress</h3>
                                    <Tag className="m-0 text-[10px] font-bold border-[rgba(0,0,0,0.06)]">{inProgressList.length}</Tag>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {inProgressList.map(renderProjectCard)}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function DevProjectView({
    project,
    mappings,
    onBack,
    functionColumnVisible,
    functionSelections,
    setFunctionSelections,
    functionOptions,
    guessFunctionFromLogic,
    onGenerateEms
}) {
    const [reviewFilter, setReviewFilter] = useState('all');
    const filteredMappings = reviewFilter === 'marked' ? (mappings || []).filter(m => m.reviewLater) : (mappings || []);
    const columns = [
        { title: 'Source Field', dataIndex: 'source', key: 'source', render: t => <span className="font-mono text-xs text-[#334155]">{t ?? '—'}</span> },
        { title: 'Business Logic', dataIndex: 'logic', key: 'logic', render: t => <span className="text-xs text-[#64748B] block max-w-md truncate">{t ?? '—'}</span> },
        { title: 'Target Field', dataIndex: 'target', key: 'target', render: t => <span className="font-mono text-xs text-emerald-600">{t ?? '—'}</span> },
        { title: 'Comments (BA)', dataIndex: 'comments', key: 'comments', render: t => <span className="text-xs text-[#64748B]">{t ?? '—'}</span> },
        { title: 'Client comments', dataIndex: 'clientComments', key: 'clientComments', render: t => <span className="text-xs text-[#475569]">{t ?? '—'}</span> },
        {
            title: 'Review',
            dataIndex: 'reviewLater',
            key: 'reviewLater',
            width: 72,
            align: 'center',
            render: (_, r) => r.reviewLater ? <FlagFilled className="text-amber-500" /> : <span className="text-[#94A3B8]">—</span>
        },
    ];
    if (functionColumnVisible) {
        columns.splice(3, 0, {
            title: 'Function (auto-selected)',
            dataIndex: 'functionCode',
            key: 'functionCode',
            render: (_, record, index) => {
                const key = record.id ?? `${record.source}-${record.target}-${index}`;
                const value = functionSelections[key] ?? guessFunctionFromLogic(record.logic);
                return (
                    <Select
                        size="small"
                        className="w-full"
                        value={value}
                        onChange={(val) => setFunctionSelections(prev => ({ ...prev, [key]: val }))}
                        options={functionOptions}
                        optionLabelProp="label"
                    />
                );
            }
        });
    }
    return (
        <Content className="p-10 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button type="text" onClick={onBack} className="text-[#64748B] hover:text-[#10B981]">← Back to projects</Button>
                </div>
                <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl p-8 bg-slate-50/20">
                    <Title level={4} className="m-0 mb-2 text-[#0F172A]">{project?.name ?? 'Project'}</Title>
                    <Text type="secondary" className="text-sm">
                        {project?.sourceSchema} → {project?.targetSchema}
                    </Text>
                </div>
                <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl overflow-hidden bg-slate-50/20">
                    <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.04)] bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.12em]">Mapping spec (Excel view)</span>
                        <Segmented
                            size="small"
                            value={reviewFilter}
                            onChange={setReviewFilter}
                            options={[
                                { label: 'All', value: 'all' },
                                { label: `Marked for review (${(mappings || []).filter(m => m.reviewLater).length})`, value: 'marked' }
                            ]}
                        />
                    </div>
                    <Table
                        dataSource={filteredMappings}
                        columns={columns}
                        rowKey={(record, idx) => record.id ?? `${record.source}-${record.target}-${idx}`}
                        pagination={false}
                        size="small"
                        locale={{ emptyText: <div className="py-10 text-[#64748B] text-xs">No mapping rules in this spec.</div> }}
                        className="studio-table"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <Button type="primary" onClick={onGenerateEms} size="middle">Generate EMS</Button>
                    <Text className="text-xs text-[#64748B] block">Download Excel or generate EMS with auto-selected functions; adjust selections in the Function column if needed.</Text>
                </div>
            </div>
        </Content>
    );
}

const SCHEMA_UPLOAD_TYPES = [
    { value: 'json_sample', label: 'JSON sample' },
    { value: 'xsd', label: 'XML / XSD' },
    { value: 'csv_sample', label: 'CSV sample' },
    { value: 'excel_spec', label: 'Excel (field name, datatype, requirement)' },
];

const EDI_OPTIONS_FIRST = ['EDI 834 v5010', 'EDI 837P'];

function ProjectWizard({ onCancel, onFinish, schemaList, setSchemaList, setSchemaTrees, fetchWithAuth }) {
    // EDI first, then custom uploaded names, then all format labels (JSON, CSV, XML, etc.) so they're always findable
    const customNames = (schemaList || []).map(s => s.name).filter(Boolean);
    const options = [...new Set([...EDI_OPTIONS_FIRST, ...customNames, ...SCHEMA_FORMATS])];
    const [name, setName] = useState('');
    const [source, setSource] = useState(options[0] || 'EDI 834 v5010');
    const [target, setTarget] = useState(options[options.length > 2 ? 2 : 1] || 'EDI 837P');
    useEffect(() => {
        if (options.length === 0) return;
        setSource(s => (options.includes(s) ? s : options[0]));
        setTarget(t => (options.includes(t) ? t : options[Math.min(1, options.length - 1)]));
    }, [options.join(',')]);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [uploadType, setUploadType] = useState('json_sample');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadName, setUploadName] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleUploadSchema = async () => {
        if (!uploadFile || !fetchWithAuth || !setSchemaList || !setSchemaTrees) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', uploadFile);
            form.append('type', uploadType);
            if (uploadName.trim()) form.append('name', uploadName.trim());
            const res = await fetchWithAuth(`${API}/schemas/upload`, {
                method: 'POST',
                body: form,
            });
            if (!res.ok) {
                const raw = await res.text();
                let errMsg = 'Upload failed';
                try {
                    const err = raw ? JSON.parse(raw) : {};
                    errMsg = err.message || err.error || errMsg;
                } catch (_) { errMsg = raw || errMsg; }
                throw new Error(errMsg);
            }
            const data = await res.json();
            setSchemaList(prev => [...(prev || []), { id: data.id, name: data.name, kind: 'custom' }]);
            if (data.tree && setSchemaTrees) setSchemaTrees(prev => ({ ...prev, [data.name]: data.tree }));
            message.success(`Schema "${data.name}" added. You can select it as Source or Target.`);
            setUploadOpen(false);
            setUploadFile(null);
            setUploadName('');
        } catch (e) {
            message.error(e.message || 'Schema upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full flex-1 flex items-center justify-center min-h-0 p-6">
            <Card className="max-w-lg w-full border border-[rgba(0,0,0,0.06)] p-6 rounded-3xl shrink-0 mx-auto bg-white" style={{ maxWidth: '32rem' }}>
                <Button type="text" icon={<ArrowLeftOutlined />} className="text-[#64748B] hover:text-[#10B981] -ml-1 mb-4 pl-0" onClick={onCancel}>
                    Back to Dashboard
                </Button>
                <div className="mb-8 text-center">
                    <Title level={3} className="mb-1 font-black text-[#0F172A]">Configure Mapping Flow</Title>
                    <Text className="text-[#64748B] text-sm">Define your project namespace and schema requirements.</Text>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mb-3 block">Project Namespace</label>
                        <Input
                            size="large"
                            placeholder="e.g. HealthLink_834_Prod"
                            className="h-12 border-[rgba(0,0,0,0.06)] bg-slate-50/80 font-mono text-sm text-[#334155] placeholder:text-[#94A3B8]"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mb-3 block">Source Format</label>
                            <Select size="large" className="w-full h-12" value={source} onChange={setSource}>
                                {options.map(k => (
                                    <Select.Option key={k} value={k}>{k}</Select.Option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-[0.2em] mb-3 block">Target Format</label>
                            <Select size="large" className="w-full h-12" value={target} onChange={setTarget}>
                                {options.map(k => (
                                    <Select.Option key={k} value={k}>{k}</Select.Option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <span className="text-[10px] text-[#64748B]">Non-EDI (JSON, XSD, CSV, Excel)?</span>
                        <Button type="link" size="small" className="p-0 h-auto text-[#10B981] font-semibold" onClick={() => setUploadOpen(true)}>
                            Upload schema
                        </Button>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button size="large" className="flex-1 h-12 font-bold" onClick={onCancel}>Cancel</Button>
                        <Button
                            size="large"
                            type="primary"
                            className="flex-1 h-12 font-bold"
                            disabled={!name}
                            onClick={() => onFinish({name, sourceSchema: source, targetSchema: target})}
                        >
                            Initialize
                        </Button>
                    </div>
                </div>
            </Card>

            <Modal
                title="Upload schema"
                open={uploadOpen}
                onCancel={() => { setUploadOpen(false); setUploadFile(null); setUploadName(''); }}
                footer={[
                    <Button key="cancel" onClick={() => { setUploadOpen(false); setUploadFile(null); setUploadName(''); }}>Cancel</Button>,
                    <Button key="upload" type="primary" loading={uploading} disabled={!uploadFile} onClick={handleUploadSchema}>
                        Upload & add to list
                    </Button>,
                ]}
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-[#475569] block mb-2">Type</label>
                        <Select
                            className="w-full"
                            value={uploadType}
                            onChange={setUploadType}
                            options={SCHEMA_UPLOAD_TYPES}
                            getPopupContainer={node => node?.parentElement ?? document.body}
                            optionFilterProp="label"
                            showSearch
                            placeholder="JSON, XML/XSD, CSV, Excel…"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#475569] block mb-2">File</label>
                        <Input
                            type="file"
                            accept={uploadType === 'json_sample' ? '.json' : uploadType === 'xsd' ? '.xsd,.xml' : uploadType === 'csv_sample' ? '.csv,.txt' : '.xlsx,.xls'}
                            onChange={e => setUploadFile(e.target.files?.[0] || null)}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-[#475569] block mb-2">Display name (optional)</label>
                        <Input placeholder="e.g. Members JSON" value={uploadName} onChange={e => setUploadName(e.target.value)} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function MappingWorkspace({ project, mappings, setMappings, selectedSource, setSelectedSource, selectedTarget, setSelectedTarget, selectedLedgerMapping, setSelectedLedgerMapping, awaitingSourcePickForEdit, setAwaitingSourcePickForEdit, awaitingTargetPickForEdit, setAwaitingTargetPickForEdit, onBack, fetchWithAuth }) {
    const [logic, setLogic] = useState('');
    const [comment, setComment] = useState('');
    const [reviewLater, setReviewLater] = useState(false);
    const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'marked'
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [editLogic, setEditLogic] = useState('');
    const [editComment, setEditComment] = useState('');
    const [findQuery, setFindQuery] = useState('');
    const [debouncedFindQuery, setDebouncedFindQuery] = useState('');
    const [composerFlashGreen, setComposerFlashGreen] = useState(false);
    const [logicSuggestionsOpen, setLogicSuggestionsOpen] = useState(false);
    const composerRef = useRef(null);
    const logicInputRef = useRef(null);

    // Suggestions most applicable to selected nodes: filter by current logic text as user types
    const filteredLogicSuggestions = useMemo(() => {
        if (!aiSuggestions.length) return [];
        const q = (logic || '').trim().toLowerCase();
        if (!q) return aiSuggestions.slice(0, 6);
        return aiSuggestions
            .filter(s => {
                const code = (s.code || '').toLowerCase();
                const label = (s.label || '').toLowerCase();
                return code.includes(q) || label.includes(q);
            })
            .slice(0, 8);
    }, [aiSuggestions, logic]);

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <Empty description="No project selected." />
                {onBack && <Button type="primary" icon={<ArrowLeftOutlined />} onClick={onBack}>Back to Dashboard</Button>}
            </div>
        );
    }

    const defaultSuggestions = useCallback((src, tgt) => {
        const srcName = (src?.title && String(src.title).trim()) ? String(src.title).trim() : (src?.key ?? 'source');
        const tgtName = (tgt?.title && String(tgt.title).trim()) ? String(tgt.title).trim() : (tgt?.key ?? 'target');
        return [
            { label: 'Map source to target', code: `Map ${srcName} to ${tgtName} in target.` },
            { label: 'Copy as-is', code: `Copy ${srcName} to ${tgtName}; use as-is.` },
            { label: 'Copy with trim and uppercase', code: `Map ${srcName} to ${tgtName}; trim and uppercase.` }
        ];
    }, []);

    const getAiSuggestions = useCallback(async (src, tgt) => {
        if (!src || !tgt || !fetchWithAuth) return;
        setIsAiThinking(true);
        try {
            const params = new URLSearchParams({ source: src.key, target: tgt.key });
            if (src.title) params.set('sourceTitle', src.title);
            if (tgt.title) params.set('targetTitle', tgt.title);
            const res = await fetchWithAuth(`${API}/ai/suggest?${params.toString()}`, { method: "POST" });
            const data = res.ok ? await res.json() : null;
            const list = Array.isArray(data) ? data : [];
            setAiSuggestions(list.length > 0 ? list : defaultSuggestions(src, tgt));
        } catch (e) {
            setAiSuggestions(defaultSuggestions(src, tgt));
        } finally {
            setIsAiThinking(false);
        }
    }, [defaultSuggestions, fetchWithAuth]);

    useEffect(() => {
        if (selectedSource && selectedTarget) {
            setLogic('');
            setLogicSuggestionsOpen(false);
            getAiSuggestions(selectedSource, selectedTarget);
        } else {
            setAiSuggestions([]);
            setLogicSuggestionsOpen(false);
        }
    }, [selectedSource, selectedTarget, getAiSuggestions]);

    // Auto-fill logic with first suggestion when suggestions load (no LLM required)
    useEffect(() => {
        if (aiSuggestions.length > 0 && !logic && selectedSource && selectedTarget) {
            const first = aiSuggestions[0];
            if (first?.code) setLogic(first.code);
        }
    }, [aiSuggestions, selectedSource, selectedTarget]);

    useEffect(() => {
        if (selectedLedgerMapping) {
            setEditLogic(selectedLedgerMapping.logic ?? '');
            setEditComment(selectedLedgerMapping.comments ?? '');
        }
    }, [selectedLedgerMapping]);
    const selectedClientComments = selectedLedgerMapping?.clientComments ?? '';

    // Reset composer when switching to a different project (no pre-populated logic/comment)
    useEffect(() => {
        setLogic('');
        setComment('');
        setReviewLater(false);
        setEditLogic('');
        setEditComment('');
        setAiSuggestions([]);
    }, [project?.id]);

    useEffect(() => {
        if (composerFlashGreen) {
            const t = setTimeout(() => setComposerFlashGreen(false), 2500);
            return () => clearTimeout(t);
        }
    }, [composerFlashGreen]);

    const commitMapping = async () => {
        if (!selectedSource || !selectedTarget) {
            message.warning("Select both source and target elements first");
            return;
        }

        const srcName = (selectedSource?.title && String(selectedSource.title).trim()) ? String(selectedSource.title).trim() : (selectedSource?.key ?? 'source');
        const tgtName = (selectedTarget?.title && String(selectedTarget.title).trim()) ? String(selectedTarget.title).trim() : (selectedTarget?.key ?? 'target');
        const finalLogic = logic || `Map ${srcName} to ${tgtName} in target.`;

        const newMapping = {
            id: Date.now(),
            source: selectedSource.title,
            target: selectedTarget.title,
            logic: finalLogic,
            comments: comment || undefined,
            reviewLater: reviewLater || undefined,
        };

        try {
            const response = await fetchWithAuth(`${API}/mappings/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: project.id,
                    projectName: project.name,
                    source: selectedSource.title,
                    target: selectedTarget.title,
                    logic: finalLogic,
                    comments: comment || null,
                    reviewLater: reviewLater || false
                })
            });

            if (!response.ok) throw new Error('API Rejection');

            const saved = await response.json();
            setMappings([saved, ...mappings]);
            setLogic('');
            setComment('');
            setReviewLater(false);
            setSelectedSource(null);
            setSelectedTarget(null);
            message.success({
                content: 'Rule committed to backend',
                icon: <CheckCircleFilled className="text-emerald-500" />
            });
        } catch (e) {
            message.error('Backend sync failed. Ensure your API is running.');
            console.error('Mapping Error:', e);
        }
    };

    const columns = [
        {
            title: 'Source Element',
            dataIndex: 'source',
            render: t => <span className="font-mono text-[10px] font-semibold text-[#334155] bg-slate-100/80 px-2 py-1 rounded border border-[rgba(0,0,0,0.04)]">{t}</span>
        },
        { title: '', width: 40, render: () => <ArrowRightOutlined className="text-[#94A3B8]" /> },
        {
            title: 'Target Element',
            dataIndex: 'target',
            render: t => <span className="font-mono text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/80">{t}</span>
        },
        {
            title: 'Execution Logic',
            dataIndex: 'logic',
            render: t => <code className="text-[10px] text-[#64748B] block max-w-xs truncate">{t}</code>
        },
        {
            title: 'Comments (BA)',
            dataIndex: 'comments',
            width: 140,
            ellipsis: true,
            render: t => <span className="text-[10px] text-[#64748B] block max-w-[10rem] truncate" title={t}>{t ?? '—'}</span>
        },
        {
            title: 'Client comments',
            dataIndex: 'clientComments',
            width: 140,
            ellipsis: true,
            render: t => <span className="text-[10px] text-[#475569] block max-w-[10rem] truncate" title={t}>{t ?? '—'}</span>
        },
        {
            title: 'Review',
            dataIndex: 'reviewLater',
            width: 64,
            align: 'center',
            render: (_, record) => (
                <Tooltip title={record.reviewLater ? 'Marked for review (click to clear)' : 'Mark for review later'}>
                    <Button
                        type="text"
                        size="small"
                        icon={record.reviewLater ? <FlagFilled className="text-amber-500" /> : <FlagOutlined className="text-[#94A3B8] hover:text-[#10B981]" />}
                        onClick={async (e) => {
                            e.stopPropagation();
                            const next = !record.reviewLater;
                            if (record.id != null) {
                                try {
                                    const res = await fetchWithAuth(`${API}/mappings/${record.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ reviewLater: next })
                                    });
                                    if (res.ok) {
                                        const updated = await res.json();
                                        setMappings(mappings.map(m => m.id === record.id ? updated : m));
                                    }
                                } catch (e) { message.error('Failed to update'); }
                            } else {
                                setMappings(mappings.map(m => m === record ? { ...m, reviewLater: next } : m));
                            }
                        }}
                    />
                </Tooltip>
            )
        },
        {
            title: '',
            align: 'center',
            width: 48,
            render: (_, record) => (
                <Tooltip title="Edit in composer">
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined className="text-[#94A3B8] hover:text-[#10B981]" />}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLedgerMapping(record);
                            setTimeout(() => {
                                composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 50);
                            setComposerFlashGreen(true);
                        }}
                    />
                </Tooltip>
            )
        },
        {
            title: '',
            align: 'right',
            width: 48,
            render: (_, record) => (
                <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined className="text-[#94A3B8] hover:text-red-400" />}
                    onClick={async (e) => {
                        e.stopPropagation();
                        if (record.id != null) {
                                try {
                                    const res = await fetchWithAuth(`${API}/mappings/${record.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                        setMappings(mappings.filter(m => m.id !== record.id));
                                        if (selectedLedgerMapping?.id === record.id) setSelectedLedgerMapping(null);
                                    }
                                } catch (e) { message.error('Failed to delete from backend'); }
                            } else {
                                setMappings(mappings.filter(m => m.id !== record.id));
                                if (selectedLedgerMapping === record) setSelectedLedgerMapping(null);
                            }
                    }}
                />
            )
        }
    ];

    const filteredMappings = reviewFilter === 'marked' ? mappings.filter(m => m.reviewLater) : mappings;

    // Debounce search so table filter updates smoothly (not on every keystroke)
    useEffect(() => {
        const q = (findQuery || '').trim();
        const t = setTimeout(() => setDebouncedFindQuery(q), 220);
        return () => clearTimeout(t);
    }, [findQuery]);

    const ledgerDisplayMappings = useMemo(() => {
        const q = (debouncedFindQuery || '').trim().toLowerCase();
        if (!q) return filteredMappings;
        return filteredMappings.filter(m => {
            const src = (m.source || '').toLowerCase();
            const tgt = (m.target || '').toLowerCase();
            const cmt = (m.comments || '').toLowerCase();
            const clientCmt = (m.clientComments || '').toLowerCase();
            const logic = (m.logic || '').toLowerCase();
            return src.includes(q) || tgt.includes(q) || cmt.includes(q) || clientCmt.includes(q) || logic.includes(q);
        });
    }, [filteredMappings, debouncedFindQuery]);

    const handleSaveEdit = async () => {
        if (!selectedLedgerMapping) return;
        const id = selectedLedgerMapping.id;
        if (id == null) {
            message.warning('Cannot save: unsaved mapping. Apply from composer instead.');
            return;
        }
        try {
            const res = await fetchWithAuth(`${API}/mappings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: selectedLedgerMapping.source ?? undefined,
                    target: selectedLedgerMapping.target ?? undefined,
                    logic: editLogic,
                    comments: editComment || null
                })
            });
            if (!res.ok) throw new Error('Update failed');
            const updated = await res.json();
            setMappings(mappings.map(m => m.id === id ? updated : m));
            setSelectedLedgerMapping(updated);
            message.success('Mapping updated');
        } catch (e) {
            message.error('Failed to update mapping');
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <Content className="p-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-8">
                    {onBack && (
                        <Button type="text" icon={<ArrowLeftOutlined />} className="text-[#64748B] hover:text-[#10B981] -ml-1 pl-0 mb-2" onClick={onBack}>
                            Back to Dashboard
                        </Button>
                    )}
                    {project?.name && (
                        <div className="flex items-baseline gap-2 truncate max-w-xl mb-1 workspace-project-name" title={project.name}>
                            <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider shrink-0">Project</span>
                            <span className="workspace-project-name-value text-sm font-bold text-[#0F172A] truncate min-w-0">{project.name}</span>
                        </div>
                    )}
                    {/* Active Composer — reused for both new mapping and edit */}
                    <div
                        ref={composerRef}
                        className={`bg-white border rounded-2xl p-8 bg-slate-50/20 transition-shadow duration-300 ${selectedLedgerMapping || composerFlashGreen ? 'composer-edit-flash border-[#10B981]' : 'border-[rgba(0,0,0,0.06)]'}`}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-10 mb-10">
                            <div className={`p-5 rounded-xl border transition-all ${(selectedLedgerMapping || selectedSource) ? 'border-[1.5px] border-[rgba(16,185,129,0.35)] bg-emerald-50/20' : 'border-[rgba(0,0,0,0.06)] bg-slate-50/40'}`}>
                                <Text className="text-[9px] font-extrabold text-[#475569] tracking-[0.2em] uppercase block mb-3">Input Element</Text>
                                {selectedLedgerMapping ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="font-semibold text-[#0F172A] text-lg truncate flex-1 min-w-0">{selectedLedgerMapping.source}</div>
                                        <Button size="small" type="default" onClick={() => { setAwaitingSourcePickForEdit(true); message.info('Click a field in the left tree'); }} className="shrink-0 text-[10px]">Change</Button>
                                    </div>
                                ) : (
                                    <div className="font-semibold text-[#0F172A] text-lg">{selectedSource ? selectedSource.title : "—"}</div>
                                )}
                                {selectedLedgerMapping && awaitingSourcePickForEdit && <span className="text-[10px] text-amber-600 mt-1 block">← Click in left tree</span>}
                            </div>
                            <div className="flex flex-col items-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${(selectedLedgerMapping || (selectedSource && selectedTarget)) ? 'bg-[#10B981] text-white' : 'bg-slate-100 text-[#94A3B8] border border-[rgba(0,0,0,0.04)]'}`}>
                                    <ArrowRightOutlined />
                                </div>
                            </div>
                            <div className={`p-5 rounded-xl border transition-all ${(selectedLedgerMapping || selectedTarget) ? 'border-[1.5px] border-[rgba(16,185,129,0.35)] bg-emerald-50/20' : 'border-[rgba(0,0,0,0.06)] bg-slate-50/40'}`}>
                                <Text className="text-[9px] font-extrabold text-[#475569] tracking-[0.2em] uppercase block mb-3">Canonical Target</Text>
                                {selectedLedgerMapping ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="font-semibold text-[#0F172A] text-lg truncate flex-1 min-w-0">{selectedLedgerMapping.target}</div>
                                        <Button size="small" type="default" onClick={() => { setAwaitingTargetPickForEdit(true); message.info('Click a field in the right tree'); }} className="shrink-0 text-[10px]">Change</Button>
                                    </div>
                                ) : (
                                    <div className="font-semibold text-[#0F172A] text-lg">{selectedTarget ? selectedTarget.title : "—"}</div>
                                )}
                                {selectedLedgerMapping && awaitingTargetPickForEdit && <span className="text-[10px] text-amber-600 mt-1 block">Click in right tree →</span>}
                            </div>
                        </div>

                        {selectedLedgerMapping ? (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-[0.15em]">Business Logic</label>
                                </div>
                                <Input.TextArea
                                    rows={4}
                                    value={editLogic}
                                    onChange={e => setEditLogic(e.target.value)}
                                    className="text-xs rounded-xl border-[rgba(0,0,0,0.06)] bg-slate-50/50 p-4 mb-4 focus:bg-white text-[#334155] placeholder:text-[#94A3B8] transition-colors"
                                    placeholder="e.g. Map ISA06 to FirstName in target; copy from source."
                                />
                                <div className="mb-6">
                                    <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-[0.12em] block mb-2">Comment (optional)</label>
                                    <Input
                                        value={editComment}
                                        onChange={e => setEditComment(e.target.value)}
                                        className="rounded-xl border-[rgba(0,0,0,0.06)] bg-slate-50/50 focus:bg-white text-[#334155] placeholder:text-[#94A3B8] transition-colors"
                                        placeholder="Optional"
                                        allowClear
                                        spellCheck
                                        autoComplete="on"
                                        autoCorrect="on"
                                        autoCapitalize="sentences"
                                    />
                                    {selectedClientComments ? (
                                        <div className="mt-2 text-[10px] text-[#64748B]">
                                            <span className="font-semibold text-[#475569]">Client comments: </span>
                                            <span>{selectedClientComments}</span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex justify-end items-center gap-2 bg-slate-50/50 p-4 rounded-xl border border-[rgba(0,0,0,0.04)]">
                                    <Button type="default" onClick={() => { setSelectedLedgerMapping(null); setAwaitingSourcePickForEdit(false); setAwaitingTargetPickForEdit(false); }} className="text-[#64748B]">
                                        Cancel
                                    </Button>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<CheckCircleFilled />}
                                        onClick={handleSaveEdit}
                                        className="px-8 font-bold bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        ) : selectedSource && selectedTarget ? (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-[0.15em]">Business Logic</label>
                                </div>
                                <div className="relative mb-4">
                                    <Input.TextArea
                                        ref={logicInputRef}
                                        rows={4}
                                        value={logic}
                                        onChange={e => setLogic(e.target.value)}
                                        onFocus={() => setLogicSuggestionsOpen(true)}
                                        onBlur={() => setTimeout(() => setLogicSuggestionsOpen(false), 180)}
                                        className="text-xs rounded-xl border-[rgba(0,0,0,0.06)] bg-slate-50/50 p-4 focus:bg-white text-[#334155] placeholder:text-[#94A3B8] transition-colors"
                                        placeholder="e.g. Map ISA06 to FirstName in target; copy from source interchange. May include logic (trim, uppercase, null-safe)."
                                    />
                                    {filteredLogicSuggestions.length > 0 && (logicSuggestionsOpen || logic) && (
                                        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-lg overflow-hidden">
                                            <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-3 py-2 border-b border-[rgba(0,0,0,0.04)]">Suggestions for selected nodes</div>
                                            {filteredLogicSuggestions.map((s, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 font-mono text-xs text-[#334155] hover:bg-emerald-50 border-b border-[rgba(0,0,0,0.04)] last:border-b-0 transition-colors"
                                                    onMouseDown={e => { e.preventDefault(); setLogic(s.code ?? ''); setLogicSuggestionsOpen(false); }}
                                                >
                                                    <span className="text-[#64748B] block text-[10px] mb-0.5">{s.label}</span>
                                                    <code className="text-[#10B981] break-all">{s.code}</code>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="mb-6">
                                    <label className="text-[10px] font-extrabold text-[#475569] uppercase tracking-[0.12em] block mb-2">Comment (optional)</label>
                                    <Input
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        className="rounded-xl border-[rgba(0,0,0,0.06)] bg-slate-50/50 focus:bg-white text-[#334155] placeholder:text-[#94A3B8] transition-colors"
                                        placeholder="e.g. SSN from member; used for eligibility lookup"
                                        allowClear
                                        spellCheck
                                        autoComplete="on"
                                        autoCorrect="on"
                                        autoCapitalize="sentences"
                                    />
                                </div>
                                <div className="mb-6 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="review-later-check"
                                        checked={reviewLater}
                                        onChange={e => setReviewLater(e.target.checked)}
                                        className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <label htmlFor="review-later-check" className="text-xs text-[#334155] cursor-pointer">Mark for review later</label>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-[rgba(0,0,0,0.04)]">
                                    <div className="flex gap-2 items-center flex-wrap">
                                        {isAiThinking ? (
                                            <div className="flex items-center gap-2 px-3 text-slate-400 text-xs">
                                                <Spin size="small" /> Loading suggestions…
                                            </div>
                                        ) : (
                                            <>
                                                {aiSuggestions.map((s, i) => (
                                                    <Button key={i} size="small" className="rounded-full text-[10px] font-semibold border-[rgba(0,0,0,0.06)] text-[#64748B] hover:text-[#10B981] hover:border-[rgba(16,185,129,0.35)]" onClick={() => setLogic(s.code)}>
                                                        {s.label}
                                                    </Button>
                                                ))}
                                                <Tooltip title="Get new suggestions">
                                                    <Button size="small" type="default" onClick={() => getAiSuggestions(selectedSource, selectedTarget)} className="text-[10px] text-[#64748B] hover:text-[#10B981]">
                                                        Refresh
                                                    </Button>
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<CheckCircleFilled />}
                                        onClick={commitMapping}
                                        className="px-12 font-bold"
                                    >
                                        Apply Rule
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 border border-dashed border-[rgba(0,0,0,0.06)] rounded-xl bg-slate-50/30">
                                <Text className="text-[#64748B] text-xs">Select nodes from sidebar trees to begin mapping</Text>
                            </div>
                        )}
                    </div>

                    {/* Ledger */}
                    <div className="bg-white border border-[rgba(0,0,0,0.06)] rounded-2xl overflow-hidden bg-slate-50/20 flex flex-col max-h-[70vh]">
                        <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.04)] bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            <span className="text-[11px] font-extrabold text-[#334155] uppercase tracking-[0.14em]">Mapping Ledger</span>
                            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0 justify-end">
                                <Input
                                    placeholder="Search source, target, comment..."
                                    value={findQuery}
                                    onChange={e => setFindQuery(e.target.value)}
                                    allowClear
                                    prefix={<SearchOutlined className="text-[#94A3B8]" />}
                                    className="ledger-search-input w-44 sm:w-52 text-xs transition-all duration-200"
                                    size="small"
                                />
                                <Segmented
                                    size="small"
                                    value={reviewFilter}
                                    onChange={setReviewFilter}
                                    options={[
                                        { label: 'All', value: 'all' },
                                        { label: `Marked for review (${mappings.filter(m => m.reviewLater).length})`, value: 'marked' }
                                    ]}
                                />
                                <Badge count={debouncedFindQuery ? ledgerDisplayMappings.length : filteredMappings.length} color="#10B981" showZero />
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar ledger-table-wrap">
                            <Table
                                dataSource={ledgerDisplayMappings}
                                columns={columns}
                                pagination={false}
                                rowKey={(r) => r.id ?? r.source + r.target}
                                className="studio-table ledger-table"
                                locale={{
                                    emptyText: debouncedFindQuery
                                        ? <div className="py-10 text-slate-400 text-xs">No mappings match your search.</div>
                                        : <div className="py-10 text-slate-400 text-xs">No mappings yet. Select source and target above, then Apply Rule.</div>
                                }}
                                onRow={(record) => ({
                                    onClick: () => setSelectedLedgerMapping(record),
                                    style: { cursor: 'pointer' },
                                    className: selectedLedgerMapping && (record.id === selectedLedgerMapping.id || (record.id == null && record === selectedLedgerMapping)) ? 'ledger-row-selected' : ''
                                })}
                            />
                        </div>
                    </div>
                </div>
            </Content>
        </div>
    );
}
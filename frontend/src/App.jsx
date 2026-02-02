import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Layout,
    Button,
    Input,
    Select,
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
    RobotOutlined,
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
    ToolOutlined
} from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// BACKEND API BASE
const API = "http://localhost:8080/api";

// --- ENTERPRISE DESIGN TOKENS ---
const THEME_TOKENS = {
    colorPrimary: '#10B981', // Studio Green
    colorBgLayout: '#FFFFFF',
    borderRadius: 6,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const STYLES = {
    mainWrapper: "h-screen w-full flex bg-white overflow-hidden",
    sidebar: "bg-white border-r border-slate-100 h-full overflow-hidden flex flex-col relative z-20",
    panelTitle: "text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white",
    premiumHeader: "bg-white border-b border-slate-100 px-8 flex items-center justify-between h-16 shrink-0 sticky top-0 z-50 relative",
    glassCard: "bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-300",
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
    ]
};

const TARGET_CANONICAL_TREE = [
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
];

const ROLE_KEY = 'mappingstudio_role';
const ACCESS_KEY_STORAGE = 'mappingstudio_access_key';

function LoginScreen({ apiBase, onSuccess }) {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!key.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiBase}/auth/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessKey: key.trim() })
            });
            if (res.ok) {
                sessionStorage.setItem(ACCESS_KEY_STORAGE, key.trim());
                onSuccess(key.trim());
            } else {
                setError('Invalid access key');
            }
        } catch {
            setError('Could not reach server');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="h-screen w-full flex bg-white items-center justify-center p-6">
            <Card className="max-w-sm w-full shadow-lg rounded-2xl border border-slate-100 p-8" style={{ maxWidth: '24rem' }}>
                <div className="text-center mb-6">
                    <div className="inline-flex p-3 rounded-xl bg-emerald-500 mb-4">
                        <ThunderboltOutlined className="text-white text-2xl" />
                    </div>
                    <Title level={4} className="!mb-1 text-slate-800">MappingStudio</Title>
                    <Text type="secondary" className="text-sm">Enter access key to continue</Text>
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
                    {error && <div className="text-red-500 text-sm mb-3">{error}</div>}
                    <Button type="primary" htmlType="submit" block size="large" loading={loading} className="font-semibold">
                        Access app
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
    const [userRole, setUserRole] = useState(() => {
        try {
            const r = localStorage.getItem(ROLE_KEY);
            return r === 'dev' ? 'dev' : 'ba';
        } catch { return 'ba'; }
    });
    const [view, setView] = useState('dashboard');
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [selectedSourceNode, setSelectedSourceNode] = useState(null);
    const [selectedTargetNode, setSelectedTargetNode] = useState(null);
    const [sourcePanelWidth, setSourcePanelWidth] = useState(320);
    const [targetPanelWidth, setTargetPanelWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
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
        if (role === 'dev') {
            setView('dashboard');
            setCurrentProject(null);
            setMappings([]);
        } else {
            // BA: if we were in dev-project view, go to dashboard so something always renders
            if (view === 'dev-project') {
                setView('dashboard');
                setCurrentProject(null);
            }
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

    // Load projects from backend on app load (so they survive refresh/restart)
    useEffect(() => {
        if (!accessKey) return;
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

    // Load mappings when opening a project (BA workspace or Dev project view)
    useEffect(() => {
        const needMappings = (view === 'workspace' && userRole === 'ba') || view === 'dev-project';
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

    if (!accessKey) {
        return (
            <ConfigProvider theme={{ token: THEME_TOKENS }}>
                <LoginScreen apiBase={API} onSuccess={setAccessKey} />
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
                                <span className="flex items-center gap-2 truncate"><DatabaseOutlined className="text-emerald-500 shrink-0" /> SOURCE: {currentProject?.sourceSchema}</span>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                                <Tree
                                    showLine={{ showLeafIcon: false }}
                                    defaultExpandAll
                                    treeData={SCHEMAS[currentProject?.sourceSchema] || SCHEMAS['EDI 834 v5010']}
                                    onSelect={(_, {node}) => node.isLeaf && setSelectedSourceNode(node)}
                                    className="premium-tree"
                                />
                            </div>
                        </aside>
                        <div
                            role="separator"
                            aria-label="Resize source panel"
                            onPointerDown={startResizeSource}
                            className="h-full w-4 flex-shrink-0 cursor-col-resize hover:bg-emerald-200 flex items-center justify-center select-none border-r-2 border-slate-200"
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
                            {(view === 'wizard' || view === 'workspace' || view === 'dev-project') && (
                                <button type="button" className="group flex items-center rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-50 p-2 transition-colors w-full min-w-0" onClick={() => { setView('dashboard'); if (view !== 'wizard') setCurrentProject(null); }} aria-label="Back">
                                    <ArrowLeftOutlined className="text-lg shrink-0" />
                                    <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Back</span>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 flex justify-center items-center px-2 shrink-0">
                            <Space size="large" className="flex-nowrap">
                                <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setView('dashboard')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setView('dashboard')}>
                                    <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center shrink-0">
                                        <ThunderboltOutlined className="text-white text-lg" />
                                    </div>
                                    <span className="font-black text-xl tracking-tighter text-slate-900 whitespace-nowrap">MappingStudio</span>
                                </div>
                                <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 shrink-0">
                                    <button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${userRole === 'ba' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setRole('ba')}>BA</button>
                                    <button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${userRole === 'dev' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setRole('dev')}>Dev</button>
                                </div>
                            </Space>
                        </div>
                        <div className={`flex items-center justify-end flex-nowrap ${view === 'dashboard' ? 'flex-1 min-w-0' : 'shrink-0'}`} style={{ gap: 0 }}>
                            {userRole === 'ba' && view === 'workspace' && (
                                <>
                                    <Tooltip title="Export Spec">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-50 p-2 transition-colors" onClick={handleExportExcel} aria-label="Export Spec">
                                            <FileExcelOutlined className="text-lg shrink-0" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5.5rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Export Spec</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Publish Spec">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-50 p-2 transition-colors" onClick={() => message.info('Publish to SharePoint – coming soon')} aria-label="Publish Spec">
                                            <CloudUploadOutlined className="text-lg shrink-0" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5.5rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Publish Spec</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Ready for Development">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md bg-emerald-500 text-white hover:bg-emerald-600 p-2 transition-colors font-bold text-sm" onClick={() => handleMarkReadyForDevelopment()} aria-label="Ready for Development">
                                            <CheckCircleFilled className="text-lg shrink-0" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[10rem] transition-[max-width] duration-300 ease-out ml-1.5">Ready for Development</span>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                            {userRole === 'dev' && view === 'dev-project' && (
                                <>
                                    <Tooltip title="Download Excel">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-50 p-2 transition-colors" onClick={handleExportExcel} aria-label="Download Excel">
                                            <FileExcelOutlined className="text-lg shrink-0" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[6rem] transition-[max-width] duration-300 ease-out ml-1.5 text-sm font-medium">Download Excel</span>
                                        </button>
                                    </Tooltip>
                                    <Tooltip title="Generate Map">
                                        <button type="button" className="group flex items-center overflow-hidden rounded-md bg-emerald-500 text-white hover:bg-emerald-600 p-2 transition-colors font-bold text-sm" onClick={() => message.info('Generate Map – coming soon')} aria-label="Generate Map">
                                            <ToolOutlined className="text-lg shrink-0" />
                                            <span className="whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[5.5rem] transition-[max-width] duration-300 ease-out ml-1.5">Generate Map</span>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </Header>

                    <div
                        className="flex-1 min-w-0 min-h-0 overflow-hidden relative flex flex-col"
                        style={{ width: '100%', minWidth: 0 }}
                    >
                        {view === 'dashboard' && (
                            <Dashboard
                                projects={projects}
                                userRole={userRole}
                                onNew={() => setView('wizard')}
                                onSelect={(p) => {
                                    setCurrentProject(p);
                                    setView(userRole === 'dev' ? 'dev-project' : 'workspace');
                                }}
                                onDelete={handleDeleteProject}
                            />
                        )}
                        {view === 'wizard' && userRole === 'ba' && (
                            <ProjectWizard
                                onCancel={() => setView('dashboard')}
                                onFinish={handleCreateProject}
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
                                    fetchWithAuth={fetchWithAuth}
                                    selectedTarget={selectedTargetNode}
                                    setSelectedTarget={setSelectedTargetNode}
                                    onBack={() => { setView('dashboard'); setCurrentProject(null); }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                                    <Empty description="No project selected" />
                                    <Button type="primary" onClick={() => setView('dashboard')}>Back to Dashboard</Button>
                                </div>
                            )
                        )}
                        {view === 'dev-project' && userRole === 'dev' && (
                            <DevProjectView project={currentProject} mappings={mappings} onBack={() => { setCurrentProject(null); setView('dashboard'); }} />
                        )}
                        {/* Fallback: BA in dev-project view or any unmatched state -> show dashboard */}
                        {view === 'dev-project' && userRole === 'ba' && (
                            <Dashboard
                                projects={projects}
                                userRole={userRole}
                                onNew={() => setView('wizard')}
                                onSelect={(p) => { setCurrentProject(p); setView('workspace'); }}
                                onDelete={handleDeleteProject}
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
                            className="h-full w-4 flex-shrink-0 cursor-col-resize hover:bg-emerald-200 flex items-center justify-center select-none border-l-2 border-slate-200"
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
                                    <span className="flex items-center gap-2 truncate min-w-0"><DeploymentUnitOutlined className="text-emerald-500 shrink-0" /> TARGET: {currentProject?.targetSchema}</span>
                                </div>
                                <div className="p-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                                    <Tree
                                        showLine={{ showLeafIcon: false }}
                                        defaultExpandAll
                                        treeData={TARGET_CANONICAL_TREE}
                                        onSelect={(_, {node}) => node.isLeaf && setSelectedTargetNode(node)}
                                        className="premium-tree"
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

function Dashboard({ projects, userRole, onNew, onSelect, onDelete }) {
    const isDev = userRole === 'dev';
    const readyForDevList = projects.filter(p => p.status === 'Ready for Development');
    const inProgressList = projects.filter(p => p.status !== 'Ready for Development');

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
                    <Title level={4} className="m-0 text-slate-800 tracking-tight flex-1 min-w-0 pr-2">{p.name}</Title>
                    <div className="flex items-center gap-1 shrink-0">
                        {!isDev && (
                            <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                className="opacity-50 hover:opacity-100"
                                onClick={(e) => onDelete(p.id, e)}
                                aria-label="Delete project"
                            />
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-6">
                    <Tag className="m-0 bg-slate-50 border-slate-100 text-slate-500 font-mono text-[10px]">{p.sourceSchema}</Tag>
                    <ArrowRightOutlined className="text-slate-300 text-[10px]" />
                    <Tag className="m-0 bg-emerald-50 border-emerald-100 text-emerald-600 font-mono text-[10px]">{p.targetSchema}</Tag>
                </div>
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    <span>Coverage</span>
                    <span>{p.coverage ?? 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
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
                className="px-6 py-10 box-border"
                style={{ width: '100%', maxWidth: '64rem', marginLeft: 'auto', marginRight: 'auto' }}
            >
                <div className="mb-10 text-center">
                    <Title level={2} className="font-black text-slate-900 mb-3">Enterprise Data Orchestration</Title>
                    <Text className="text-slate-400 text-base block">
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

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-slate-300 border border-slate-100">
                            <PlusOutlined style={{ fontSize: 22 }} />
                        </div>
                        <Title level={4} className="text-slate-700 m-0 mb-1">{isDev ? 'No Projects Yet' : 'No Active Projects'}</Title>
                        <Text className="text-slate-400 text-sm">{isDev ? 'No mapping specs have been published yet.' : 'Create your first mapping project above.'}</Text>
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
                                    <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-slate-500">Spec creation in progress</h3>
                                    <Tag className="m-0 text-[10px] font-bold border-slate-200">{inProgressList.length}</Tag>
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

function DevProjectView({ project, mappings, onBack }) {
    const columns = [
        { title: 'Source Field', dataIndex: 'source', key: 'source', render: t => <span className="font-mono text-xs text-slate-600">{t ?? '—'}</span> },
        { title: 'Mapping Logic', dataIndex: 'logic', key: 'logic', render: t => <code className="text-xs text-slate-500 block max-w-md truncate">{t ?? '—'}</code> },
        { title: 'Target Field', dataIndex: 'target', key: 'target', render: t => <span className="font-mono text-xs text-emerald-600">{t ?? '—'}</span> },
        { title: 'Comments', dataIndex: 'comments', key: 'comments', render: t => <span className="text-xs text-slate-400">{t ?? '—'}</span> },
    ];
    return (
        <Content className="p-10 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button type="text" onClick={onBack} className="text-slate-500">← Back to projects</Button>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                    <Title level={4} className="m-0 mb-2 text-slate-800">{project?.name ?? 'Project'}</Title>
                    <Text type="secondary" className="text-sm">
                        {project?.sourceSchema} → {project?.targetSchema}
                    </Text>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapping spec (Excel view)</span>
                    </div>
                    <Table
                        dataSource={mappings}
                        columns={columns}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: <div className="py-10 text-slate-400 text-xs">No mapping rules in this spec.</div> }}
                        className="studio-table"
                    />
                </div>
                <Text className="text-xs text-slate-400 block">Use header actions to Download Excel or Generate Map.</Text>
            </div>
        </Content>
    );
}

function ProjectWizard({ onCancel, onFinish }) {
    const [name, setName] = useState('');
    const [source, setSource] = useState('EDI 834 v5010');
    const [target, setTarget] = useState('JSON Schema');

    return (
        <div className="w-full flex-1 flex items-center justify-center min-h-0 p-6">
            <Card className="max-w-lg w-full shadow-2xl border-none p-6 rounded-3xl shrink-0 mx-auto" style={{ maxWidth: '32rem' }}>
                <Button type="text" icon={<ArrowLeftOutlined />} className="text-slate-500 hover:text-emerald-600 -ml-1 mb-4 pl-0" onClick={onCancel}>
                    Back to Dashboard
                </Button>
                <div className="mb-8 text-center">
                    <Title level={3} className="mb-1 font-black">Configure Mapping Flow</Title>
                    <Text type="secondary">Define your project namespace and schema requirements.</Text>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 block">Project Namespace</label>
                        <Input
                            size="large"
                            placeholder="e.g. HealthLink_834_Prod"
                            className="h-12 border-slate-100 bg-slate-50 font-mono text-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 block">Source Format</label>
                            <Select size="large" className="w-full h-12" value={source} onChange={setSource}>
                                {SCHEMA_FORMATS.map(k => (
                                    <Select.Option key={k} value={k}>{k}</Select.Option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 block">Target Format</label>
                            <Select size="large" className="w-full h-12" value={target} onChange={setTarget}>
                                {SCHEMA_FORMATS.map(k => (
                                    <Select.Option key={k} value={k}>{k}</Select.Option>
                                ))}
                            </Select>
                        </div>
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
        </div>
    );
}

function MappingWorkspace({ project, mappings, setMappings, selectedSource, setSelectedSource, selectedTarget, setSelectedTarget, onBack, fetchWithAuth }) {
    const [logic, setLogic] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
                <Empty description="No project selected." />
                {onBack && <Button type="primary" icon={<ArrowLeftOutlined />} onClick={onBack}>Back to Dashboard</Button>}
            </div>
        );
    }

    const defaultSuggestions = useCallback((src, tgt) => [
        { label: 'Direct Mapping', code: `target.${tgt.key} = source.${src.key};` },
        { label: 'Standard Clean', code: `target.${tgt.key} = source.${src.key}?.trim().toUpperCase();` }
    ], []);

    const getAiSuggestions = useCallback(async (src, tgt) => {
        if (!src || !tgt || !fetchWithAuth) return;
        setIsAiThinking(true);
        try {
            const res = await fetchWithAuth(`${API}/ai/suggest?source=${src.key}&target=${tgt.key}`, { method: "POST" });
            const data = await res.json();
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
            getAiSuggestions(selectedSource, selectedTarget);
        } else {
            setAiSuggestions([]);
        }
    }, [selectedSource, selectedTarget, getAiSuggestions]);

    const commitMapping = async () => {
        if (!selectedSource || !selectedTarget) {
            message.warning("Select both source and target elements first");
            return;
        }

        const finalLogic = logic || `target.${selectedTarget.key} = source.${selectedSource.key};`;

        const newMapping = {
            id: Date.now(),
            source: selectedSource.title,
            target: selectedTarget.title,
            logic: finalLogic,
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
                    logic: finalLogic
                })
            });

            if (!response.ok) throw new Error('API Rejection');

            const saved = await response.json();
            setMappings([saved, ...mappings]);
            setLogic('');
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
            render: t => <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded">{t}</span>
        },
        { title: '', width: 40, render: () => <ArrowRightOutlined className="text-slate-200" /> },
        {
            title: 'Target Element',
            dataIndex: 'target',
            render: t => <span className="font-mono text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{t}</span>
        },
        {
            title: 'Execution Logic',
            dataIndex: 'logic',
            render: t => <code className="text-[10px] text-slate-400 block max-w-xs truncate">{t}</code>
        },
        {
            title: '',
            align: 'right',
            render: (_, record) => (
                <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined className="opacity-30 hover:opacity-100" />}
                    onClick={async () => {
                        if (record.id != null) {
                            try {
                                const res = await fetchWithAuth(`${API}/mappings/${record.id}`, { method: 'DELETE' });
                                if (res.ok) setMappings(mappings.filter(m => m.id !== record.id));
                            } catch (e) { message.error('Failed to delete from backend'); }
                        } else {
                            setMappings(mappings.filter(m => m.id !== record.id));
                        }
                    }}
                />
            )
        }
    ];

    return (
        <div className="h-full flex flex-col bg-white">
            <Content className="p-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-8">
                    {onBack && (
                        <Button type="text" icon={<ArrowLeftOutlined />} className="text-slate-500 hover:text-emerald-600 -ml-1 pl-0 mb-2" onClick={onBack}>
                            Back to Dashboard
                        </Button>
                    )}
                    {/* Active Composer */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-10 mb-10">
                            <div className={`p-5 rounded-xl border transition-all ${selectedSource ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-50 bg-slate-50/30'}`}>
                                <Text className="text-[9px] font-black text-slate-400 tracking-widest uppercase block mb-3">Input Element</Text>
                                <div className="font-black text-slate-900 text-lg">{selectedSource ? selectedSource.title : "—"}</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className={`w-12 h-12 rounded-full border flex items-center justify-center mb-2 transition-all ${selectedSource && selectedTarget ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-100 text-slate-200'}`}>
                                    <ArrowRightOutlined />
                                </div>
                            </div>
                            <div className={`p-5 rounded-xl border transition-all ${selectedTarget ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-50 bg-slate-50/30'}`}>
                                <Text className="text-[9px] font-black text-slate-400 tracking-widest uppercase block mb-3">Canonical Target</Text>
                                <div className="font-black text-slate-900 text-lg">{selectedTarget ? selectedTarget.title : "—"}</div>
                            </div>
                        </div>

                        {selectedSource && selectedTarget && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Script</label>
                                    <Tag className="m-0 text-[10px] border-none bg-slate-50 font-bold">NODE.JS</Tag>
                                </div>
                                <Input.TextArea
                                    rows={4}
                                    value={logic}
                                    onChange={e => setLogic(e.target.value)}
                                    className="font-mono text-xs rounded-xl border-slate-100 bg-slate-50/50 p-4 mb-6 focus:bg-white transition-all"
                                    placeholder={`e.g. target.${selectedTarget.key} = source.${selectedSource.key};`}
                                />
                                <div className="flex justify-between items-center bg-slate-50/30 p-4 rounded-xl">
                                    <div className="flex gap-2 items-center">
                                        {isAiThinking ? (
                                            <div className="flex items-center gap-2 px-3 text-slate-400 text-xs">
                                                <Spin size="small" /> AI Analysis...
                                            </div>
                                        ) : aiSuggestions.map((s, i) => (
                                            <Button key={i} size="small" className="rounded-full text-[10px] font-bold border-slate-200 hover:border-emerald-500" onClick={() => setLogic(s.code)}>
                                                <RobotOutlined className="text-emerald-500" /> {s.label}
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<CheckCircleFilled />}
                                        onClick={commitMapping}
                                        className="px-12 font-bold shadow-lg shadow-emerald-200"
                                    >
                                        Apply Rule
                                    </Button>
                                </div>
                            </div>
                        )}

                        {!selectedSource && !selectedTarget && (
                            <div className="text-center py-4 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">
                                <Text className="text-slate-400 text-xs">Select nodes from sidebar trees to begin mapping</Text>
                            </div>
                        )}
                    </div>

                    {/* Ledger */}
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapping Ledger</span>
                            <Badge count={mappings.length} color="#10B981" />
                        </div>
                        <Table
                            dataSource={mappings}
                            columns={columns}
                            pagination={false}
                            rowKey="id"
                            className="studio-table"
                            locale={{ emptyText: <div className="py-10 text-slate-400 text-xs">No active mapping rules in ledger.</div> }}
                        />
                    </div>
                </div>
            </Content>
        </div>
    );
}
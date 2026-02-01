import React, { useState, useEffect, useCallback } from 'react';
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
    Avatar,
    Table,
    Tag,
    Modal,
    Spin,
    Empty,
    Card,
    Typography,
    Divider
} from 'antd';
import {
    PlusOutlined,
    ArrowRightOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    FileTextOutlined,
    RobotOutlined,
    HomeOutlined,
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
    FileExcelOutlined
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
    premiumHeader: "bg-white border-b border-slate-100 px-8 flex items-center justify-between h-16 shrink-0 sticky top-0 z-50",
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

export default function App() {
    const [view, setView] = useState('dashboard');
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [selectedSourceNode, setSelectedSourceNode] = useState(null);
    const [selectedTargetNode, setSelectedTargetNode] = useState(null);

    const handleCreateProject = (newProject) => {
        const projectWithId = {
            ...newProject,
            id: Date.now(),
            status: 'Draft',
            updated: 'Just now',
            coverage: 0
        };
        setProjects(prev => [projectWithId, ...prev]);
        setCurrentProject(projectWithId);
        setMappings([]);
        setView('workspace');
    };

    return (
        <ConfigProvider theme={{ token: THEME_TOKENS }}>
            <div className={STYLES.mainWrapper}>
                {view === 'workspace' && (
                    <aside style={{ width: 320 }} className={STYLES.sidebar}>
                        <div className={STYLES.panelTitle}>
                            <span className="flex items-center gap-2"><DatabaseOutlined className="text-emerald-500" /> SOURCE: {currentProject?.sourceSchema}</span>
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
                )}

                <main className="flex-1 flex flex-col overflow-hidden bg-white">
                    <Header className={STYLES.premiumHeader}>
                        <Space size="large">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
                                <div className="bg-emerald-500 p-1.5 rounded-lg flex items-center justify-center">
                                    <ThunderboltOutlined className="text-white text-lg" />
                                </div>
                                <span className="font-black text-xl tracking-tighter text-slate-900">MappingStudio</span>
                            </div>
                            {view !== 'dashboard' && (
                                <>
                                    <div className="h-4 w-[1px] bg-slate-200" />
                                    <Button
                                        type="text"
                                        icon={<HomeOutlined />}
                                        className="text-slate-500 hover:text-emerald-600 font-medium"
                                        onClick={() => setView('dashboard')}
                                    >
                                        Home
                                    </Button>
                                </>
                            )}
                        </Space>
                        <Space>
                            {view === 'workspace' && (
                                <>
                                    <Button
                                        icon={<FileExcelOutlined />}
                                        type="text"
                                        className="text-slate-500 hover:text-emerald-600 font-medium"
                                        onClick={() => {
                                            if (!currentProject?.name) {
                                                message.error("No project selected");
                                                return;
                                            }
                                            window.open(
                                                `${API}/export/excel/${currentProject.name}`,
                                                "_blank"
                                            );
                                        }}
                                    >
                                        Export Spec
                                    </Button>
                                    <Button type="primary" icon={<ExportOutlined />} className="font-bold">Deploy Map</Button>
                                </>
                            )}
                            <Avatar size="small" className="bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">JD</Avatar>
                        </Space>
                    </Header>

                    <div className="flex-1 overflow-hidden relative">
                        {view === 'dashboard' && (
                            <Dashboard
                                projects={projects}
                                onNew={() => setView('wizard')}
                                onSelect={(p) => { setCurrentProject(p); setView('workspace'); }}
                            />
                        )}
                        {view === 'wizard' && (
                            <ProjectWizard
                                onCancel={() => setView('dashboard')}
                                onFinish={handleCreateProject}
                            />
                        )}
                        {view === 'workspace' && (
                            <MappingWorkspace
                                project={currentProject}
                                mappings={mappings}
                                setMappings={setMappings}
                                selectedSource={selectedSourceNode}
                                setSelectedSource={setSelectedSourceNode}
                                selectedTarget={selectedTargetNode}
                                setSelectedTarget={setSelectedTargetNode}
                            />
                        )}
                    </div>
                </main>

                {view === 'workspace' && (
                    <aside style={{ width: 320 }} className={`${STYLES.sidebar} border-l border-r-0`}>
                        <div className={STYLES.panelTitle}>
                            <span className="flex items-center gap-2"><DeploymentUnitOutlined className="text-emerald-500" /> TARGET: {currentProject?.targetSchema}</span>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            <Tree
                                showLine={{ showLeafIcon: false }}
                                defaultExpandAll
                                treeData={TARGET_CANONICAL_TREE}
                                onSelect={(_, {node}) => node.isLeaf && setSelectedTargetNode(node)}
                                className="premium-tree"
                            />
                        </div>
                    </aside>
                )}
            </div>
        </ConfigProvider>
    );
}

function Dashboard({ projects, onNew, onSelect }) {
    return (
        <div className="p-20 max-w-6xl mx-auto w-full h-full overflow-y-auto custom-scrollbar">
            <div className="text-center mb-16">
                <Title level={2} className="font-black text-slate-900 mb-4">Enterprise Data Orchestration</Title>
                <Text className="text-slate-400 text-lg">Initialize a mapping project to begin schema synchronization.</Text>
            </div>

            {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 text-slate-300 border border-slate-100">
                        <PlusOutlined style={{ fontSize: 24 }} />
                    </div>
                    <Title level={4} className="text-slate-800 m-0 mb-2">No Active Projects</Title>
                    <Text className="text-slate-400 mb-8">Your workspace is currently empty.</Text>
                    <Button
                        type="primary"
                        size="large"
                        className="px-12 h-14 font-bold text-base rounded-2xl"
                        onClick={onNew}
                    >
                        New Mapping Project
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map(p => (
                        <Card
                            key={p.id}
                            hoverable
                            className={STYLES.glassCard}
                            bodyStyle={{ padding: '24px' }}
                            onClick={() => onSelect(p)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <Title level={4} className="m-0 text-slate-800 tracking-tight">{p.name}</Title>
                                <Tag color="green" className="m-0 border-none font-bold uppercase text-[9px] px-2">{p.status}</Tag>
                            </div>
                            <div className="flex items-center gap-2 mb-6">
                                <Tag className="m-0 bg-slate-50 border-slate-100 text-slate-500 font-mono text-[10px]">{p.sourceSchema}</Tag>
                                <ArrowRightOutlined className="text-slate-300 text-[10px]" />
                                <Tag className="m-0 bg-emerald-50 border-emerald-100 text-emerald-600 font-mono text-[10px]">{p.targetSchema}</Tag>
                            </div>
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                <span>Coverage</span>
                                <span>{p.coverage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${p.coverage}%` }} />
                            </div>
                        </Card>
                    ))}
                    <div
                        onClick={onNew}
                        className="border-2 border-dashed border-slate-100 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-200 hover:bg-emerald-50/30 transition-all min-h-[160px]"
                    >
                        <PlusOutlined className="text-slate-300 text-xl" />
                    </div>
                </div>
            )}
        </div>
    );
}

function ProjectWizard({ onCancel, onFinish }) {
    const [name, setName] = useState('');
    const [source, setSource] = useState('EDI 834 v5010');
    const [target, setTarget] = useState('JSON Schema');

    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-lg shadow-2xl border-none p-4 rounded-3xl">
                <div className="mb-10 text-center">
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

function MappingWorkspace({ project, mappings, setMappings, selectedSource, setSelectedSource, selectedTarget, setSelectedTarget }) {
    const [logic, setLogic] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);

    const getAiSuggestions = useCallback(async (src, tgt) => {
        if (!src || !tgt) return;
        setIsAiThinking(true);
        try {
            const res = await fetch(`${API}/ai/suggest?source=${src.key}&target=${tgt.key}`, { method: "POST" });
            const data = await res.json();
            setAiSuggestions(data || []);
        } catch (e) {
            setAiSuggestions([
                { label: 'Direct Mapping', code: `target.${tgt.key} = source.${src.key};` },
                { label: 'Standard Clean', code: `target.${tgt.key} = source.${src.key}?.trim().toUpperCase();` }
            ]);
        } finally {
            setIsAiThinking(false);
        }
    }, []);

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
            const response = await fetch(`${API}/mappings/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName: project.name,
                    source: selectedSource.title,
                    target: selectedTarget.title,
                    logic: finalLogic
                })
            });

            if (!response.ok) throw new Error('API Rejection');

            setMappings([newMapping, ...mappings]);
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
                    onClick={() => setMappings(mappings.filter(m => m.id !== record.id))}
                />
            )
        }
    ];

    return (
        <div className="h-full flex flex-col bg-white">
            <Content className="p-10 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-8">
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
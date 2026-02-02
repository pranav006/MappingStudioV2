import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class AppErrorBoundary extends React.Component {
    state = { hasError: false, error: null }
    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }
    componentDidCatch(error, info) {
        console.error('App error:', error, info)
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600 }}>
                    <h1 style={{ color: '#b91c1c' }}>Something went wrong</h1>
                    <p style={{ color: '#666' }}>{this.state.error?.message || 'An error occurred.'}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer' }}>Reload page</button>
                </div>
            )
        }
        return this.props.children
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AppErrorBoundary>
            <App />
        </AppErrorBoundary>
    </React.StrictMode>,
)
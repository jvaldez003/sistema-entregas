export default function ConfirmModal({ open, titulo, mensaje, onConfirm, onCancel }) {
    if (!open) return null
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={onCancel}>
            <div style={{
                background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400,
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#fdf0ef', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0
                    }}>🗑</div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{titulo || 'Confirmar eliminación'}</h2>
                </div>

                {/* Mensaje */}
                <p style={{ padding: '12px 24px 20px', fontSize: 14, color: '#555', lineHeight: 1.5 }}>
                    {mensaje || '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.'}
                </p>

                {/* Botones */}
                <div style={{
                    display: 'flex', gap: 10, padding: '16px 24px',
                    borderTop: '1px solid #f0f0f0', justifyContent: 'flex-end'
                }}>
                    <button onClick={onCancel} style={{
                        padding: '9px 20px', borderRadius: 8, border: '1px solid #ddd',
                        background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#555'
                    }}>Cancelar</button>
                    <button onClick={onConfirm} style={{
                        padding: '9px 20px', borderRadius: 8, border: 'none',
                        background: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff'
                    }}>Sí, eliminar</button>
                </div>
            </div>
        </div>
    )
}
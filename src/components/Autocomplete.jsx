import { useState, useRef, useEffect } from 'react'

export default function Autocomplete({ value, onChange, options = [], placeholder }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState(value || '')
    const wrapRef = useRef(null)

    useEffect(() => { setQuery(value || '') }, [value])

    useEffect(() => {
        function close(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const filtered = !query.trim()
        ? options
        : options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

    function select(opt) {
        setQuery(opt)
        onChange(opt)
        setOpen(false)
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={query}
                    placeholder={placeholder || 'Escriba para buscar…'}
                    autoComplete="off"
                    onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                    style={{ width: '100%', paddingRight: 32 }}
                />
                <span
                    onMouseDown={e => { e.preventDefault(); setOpen(o => !o) }}
                    style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        cursor: 'pointer', fontSize: 11, color: '#888', userSelect: 'none'
                    }}
                >{open ? '▲' : '▼'}</span>
            </div>

            {open && (
                <ul style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: '#fff', border: '1.5px solid #3b82f6',
                    borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    listStyle: 'none', margin: 0, padding: '4px 0',
                    zIndex: 9999, maxHeight: 220, overflowY: 'auto'
                }}>
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li
                            key={opt}
                            onMouseDown={() => select(opt)}
                            style={{
                                padding: '9px 14px', cursor: 'pointer', fontSize: 14,
                                background: opt === value ? '#eff6ff' : '#fff',
                                color: opt === value ? '#1d4ed8' : '#111'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                            onMouseLeave={e => e.currentTarget.style.background = opt === value ? '#eff6ff' : '#fff'}
                        >
                            {opt}
                        </li>
                    )) : (
                        <li style={{ padding: '10px 14px', color: '#999', fontSize: 13 }}>
                            {options.length === 0 ? 'Sin registros — agrega desde Administración' : 'Sin coincidencias'}
                        </li>
                    )}
                </ul>
            )}
        </div>
    )
}
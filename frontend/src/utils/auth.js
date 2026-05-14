export function getRoleFromToken(token) {
    if (!token)
        return null;
    try {
        const [, payload] = token.split('.');
        if (!payload)
            return null;
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(window.atob(normalized));
        return typeof decoded?.role === 'string' ? decoded.role : null;
    }
    catch {
        return null;
    }
}

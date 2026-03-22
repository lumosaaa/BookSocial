import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Button, message } from 'antd';
import { UserAddOutlined, UsergroupAddOutlined, CheckOutlined } from '@ant-design/icons';
import { toggleFollow } from '../api/postApi';
import { useAuthStore } from '../store/authStore';
const FollowButton = ({ userId, initialFollowed = false, isMutual = false, onToggle, size = 'middle', }) => {
    const { user } = useAuthStore();
    const [followed, setFollowed] = useState(initialFollowed);
    const [mutual, setMutual] = useState(isMutual);
    const [loading, setLoading] = useState(false);
    // 不展示自己对自己的按钮
    if (!user || user.id === userId)
        return null;
    const handleClick = async (e) => {
        e.stopPropagation();
        if (loading)
            return;
        setLoading(true);
        try {
            const res = await toggleFollow(userId);
            setFollowed(res.followed);
            setMutual(res.isMutual);
            onToggle?.(res.followed, res.isMutual);
            message.success(res.followed ? '关注成功' : '已取消关注');
        }
        catch {
            message.error('操作失败，请重试');
        }
        finally {
            setLoading(false);
        }
    };
    if (mutual) {
        return (_jsx(Button, { size: size, icon: _jsx(UsergroupAddOutlined, {}), onClick: handleClick, loading: loading, style: { borderColor: '#4A6741', color: '#4A6741' }, children: "\u4E92\u76F8\u5173\u6CE8" }));
    }
    if (followed) {
        return (_jsx(Button, { size: size, icon: _jsx(CheckOutlined, {}), onClick: handleClick, loading: loading, children: "\u5DF2\u5173\u6CE8" }));
    }
    return (_jsx(Button, { type: "primary", size: size, icon: _jsx(UserAddOutlined, {}), onClick: handleClick, loading: loading, children: "\u5173\u6CE8" }));
};
export default FollowButton;

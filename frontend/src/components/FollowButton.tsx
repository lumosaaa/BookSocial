import React, { useState } from 'react';
import { Button, message } from 'antd';
import { UserAddOutlined, UsergroupAddOutlined, CheckOutlined } from '@ant-design/icons';
import { toggleFollow } from '../api/postApi';
import { useAuthStore } from '../store/authStore';

interface Props {
  userId: number;
  initialFollowed?: boolean;
  isMutual?: boolean;
  onToggle?: (followed: boolean, isMutual: boolean) => void;
  size?: 'small' | 'middle' | 'large';
}

const FollowButton: React.FC<Props> = ({
  userId,
  initialFollowed = false,
  isMutual = false,
  onToggle,
  size = 'middle',
}) => {
  const { user } = useAuthStore();
  const [followed, setFollowed]  = useState(initialFollowed);
  const [mutual, setMutual]      = useState(isMutual);
  const [loading, setLoading]    = useState(false);

  // 不展示自己对自己的按钮
  if (!user || user.id === userId) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      const res = await toggleFollow(userId);
      setFollowed(res.followed);
      setMutual(res.isMutual);
      onToggle?.(res.followed, res.isMutual);
      message.success(res.followed ? '关注成功' : '已取消关注');
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (mutual) {
    return (
      <Button
        size={size}
        icon={<UsergroupAddOutlined />}
        onClick={handleClick}
        loading={loading}
        style={{ borderColor: '#4A6741', color: '#4A6741' }}
      >
        互相关注
      </Button>
    );
  }

  if (followed) {
    return (
      <Button
        size={size}
        icon={<CheckOutlined />}
        onClick={handleClick}
        loading={loading}
      >
        已关注
      </Button>
    );
  }

  return (
    <Button
      type="primary"
      size={size}
      icon={<UserAddOutlined />}
      onClick={handleClick}
      loading={loading}
    >
      关注
    </Button>
  );
};

export default FollowButton;

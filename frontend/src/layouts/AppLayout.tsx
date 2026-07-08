import { useMemo } from 'react'
import { Layout, Menu, Avatar, Dropdown, Space, Tag } from 'antd'
import {
  DashboardOutlined,
  ScheduleOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  BookOutlined,
  EditOutlined,
  BulbOutlined,
  LinkOutlined,
  TrophyOutlined,
  BarChartOutlined,
  RobotOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

const { Sider, Header, Content } = Layout

const NAV = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/plans', icon: <ScheduleOutlined />, label: '学习计划' },
  { key: '/focus', icon: <ThunderboltOutlined />, label: '深度工作' },
  { key: '/practice', icon: <EditOutlined />, label: '刻意练习' },
  { key: '/knowledge', icon: <ApartmentOutlined />, label: '知识图谱' },
  { key: '/reading', icon: <BookOutlined />, label: '海绵阅读' },
  { key: '/critical', icon: <BulbOutlined />, label: '批判思维' },
  { key: '/action', icon: <LinkOutlined />, label: '知行转化' },
  { key: '/agent', icon: <RobotOutlined />, label: 'AI 助手' },
  { key: '/rewards', icon: <TrophyOutlined />, label: '奖励中心' },
  { key: '/analytics', icon: <BarChartOutlined />, label: '学习分析' },
  { key: '/social', icon: <TeamOutlined />, label: '学习社区' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function AppLayout() {
  const nav = useNavigate()
  const loc = useLocation()
  const { user, logout } = useAuthStore()

  // live balance badge in header
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: api.balance,
    refetchInterval: 60_000,
  })

  const selectedKey = useMemo(() => {
    if (loc.pathname === '/') return '/'
    const match = NAV.find((n) => n.key !== '/' && loc.pathname.startsWith(n.key))
    return match?.key ?? '/'
  }, [loc.pathname])

  const userMenu = {
    items: [
      { key: 'settings', icon: <SettingOutlined />, label: '个人设置', onClick: () => nav('/settings') },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => {
          logout()
          nav('/login', { replace: true })
        },
      },
    ],
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={232}
        theme="light"
        breakpoint="lg"
        collapsedWidth={0}
        style={{ borderRight: '1px solid #f0f0f0', position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', borderBottom: '1px solid #f5f5f5' }}>
          <span style={{ fontSize: 22 }}>🌊</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#2563eb' }}>LearnFlow</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV.map((n) => ({ key: n.key, icon: n.icon, label: n.label }))}
          onClick={({ key }) => nav(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Space size="large">
            <Tag icon={<FireOutlined />} color="orange">
              连续 {balance?.streak_days ?? user?.streak_days ?? 0} 天
            </Tag>
            <Tag color="gold">🪙 {balance?.token_balance ?? user?.token_balance ?? 0} 积分</Tag>
            <Tag color="purple">★ {user?.reputation ?? 0} 声望</Tag>
          </Space>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#2563eb' }}>
                {(user?.display_name ?? user?.username ?? 'U').charAt(0).toUpperCase()}
              </Avatar>
              <span style={{ fontWeight: 500 }}>{user?.display_name ?? user?.username}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ background: '#f5f7fa' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

import { useState } from 'react'
import { Card, Form, Input, Button, Tabs, Typography, App } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export default function Login() {
  const nav = useNavigate()
  const { message } = App.useApp()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)

  async function doLogin(values: { username: string; password: string }) {
    setLoading(true)
    try {
      const res = await api.login(values)
      setAuth(res.access_token, res.user)
      message.success(`欢迎回来，${res.user.display_name ?? res.user.username}！`)
      nav('/', { replace: true })
    } catch (e) {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  async function doRegister(values: { username: string; email: string; password: string; display_name?: string }) {
    setLoading(true)
    try {
      const res = await api.register(values)
      setAuth(res.access_token, res.user)
      message.success('注册成功，欢迎加入 LearnFlow！')
      nav('/', { replace: true })
    } catch (e) {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1f36 0%, #2563eb 100%)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🌊</div>
          <Title level={2} style={{ color: '#fff', margin: '8px 0 4px' }}>
            LearnFlow
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.75)' }}>
            AI 驱动的个人学习辅助系统
          </Text>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['刻意练习', '深度工作', '海绵阅读', '知行转化', '批判思维'].map((t) => (
              <span key={t} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: 12 }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <Card>
          <Tabs
            centered
            items={[
              {
                key: 'login',
                label: '登录',
                children: (
                  <Form layout="vertical" onFinish={doLogin} size="large">
                    <Form.Item name="username" label="用户名 / 邮箱" rules={[{ required: true, message: '请输入用户名或邮箱' }]}>
                      <Input prefix={<UserOutlined />} placeholder="用户名或邮箱" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      登录
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: '注册',
                children: (
                  <Form layout="vertical" onFinish={doRegister} size="large">
                    <Form.Item name="username" label="用户名" rules={[{ required: true, min: 2, max: 64, message: '用户名 2-64 字符' }]}>
                      <Input prefix={<UserOutlined />} placeholder="用户名" />
                    </Form.Item>
                    <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                      <Input prefix={<MailOutlined />} placeholder="邮箱" />
                    </Form.Item>
                    <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, max: 128, message: '密码至少 6 位' }]}>
                      <Input.Password prefix={<LockOutlined />} placeholder="至少 6 位密码" />
                    </Form.Item>
                    <Form.Item name="display_name" label="昵称（可选）">
                      <Input placeholder="显示昵称" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                      注册并开始学习
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </Card>
        <Text style={{ display: 'block', textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 12 }}>
          融合心理学 · 社会学 · 金融学的跨学科奖励机制
        </Text>
      </div>
    </div>
  )
}

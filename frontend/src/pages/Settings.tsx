import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Tag, Descriptions, Typography, Space, Spin, Divider, App, Row, Col } from 'antd'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const TIER_LABEL: Record<string, string> = {
  free: '免费版',
  pro: '专业版',
  premium: '高级版',
}

export default function Settings() {
  const { message } = App.useApp()
  const nav = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        display_name: user.display_name ?? '',
        avatar_url: user.avatar_url ?? '',
        bio: user.bio ?? '',
        vocation: (user.preferences?.vocation as string) ?? '',
      })
    }
  }, [user, form])

  if (!user) {
    return (
      <div className="lf-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  async function handleSave(values: {
    display_name?: string
    avatar_url?: string
    bio?: string
    vocation?: string
  }) {
    setSaving(true)
    try {
      const updated = await api.updateMe({
        display_name: values.display_name,
        avatar_url: values.avatar_url,
        bio: values.bio,
        preferences: { ...(user?.preferences ?? {}), vocation: values.vocation },
      })
      useAuthStore.getState().setUser(updated)
      message.success('设置已保存')
    } catch (e) {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    useAuthStore.getState().logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        个人设置
      </Title>

      <Row gutter={24}>
        {/* profile form */}
        <Col xs={24} lg={14}>
          <Card title="个人资料">
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item name="display_name" label="昵称">
                <Input placeholder="显示昵称" />
              </Form.Item>
              <Form.Item name="avatar_url" label="头像 URL">
                <Input placeholder="https://..." />
              </Form.Item>
              <Form.Item name="bio" label="个人简介">
                <Input.TextArea rows={3} placeholder="一句话介绍自己" />
              </Form.Item>
              <Form.Item name="vocation" label="职业 / 方向">
                <Input placeholder="例如：前端工程师 / 英语学习者" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={saving}>
                保存
              </Button>
            </Form>
          </Card>
        </Col>

        {/* account info + actions */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card title="账户信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
                <Descriptions.Item label="账户等级">
                  <Tag color="blue">{TIER_LABEL[user.tier] ?? user.tier}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {dayjs(user.created_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="用户 ID">
                  <Text code copyable style={{ fontSize: 12 }}>
                    {user.id}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="会话">
              <Button danger icon={<LogoutOutlined />} onClick={handleLogout} block>
                退出登录
              </Button>
            </Card>

            {/* danger zone */}
            <Card
              title={<Text type="danger">危险区域</Text>}
              style={{ borderColor: '#ffccc7' }}
              headStyle={{ color: '#cf1322' }}
            >
              <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                账号删除会永久清除你的学习数据，且不可恢复。
              </Paragraph>
              <Space>
                <UserOutlined style={{ color: '#8c8c8c' }} />
                <Text type="secondary">如需删除账号，请联系管理员处理。</Text>
              </Space>
              <Divider style={{ margin: '12px 0' }} />
              <Tag color="red">联系管理员删除账号</Tag>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  )
}

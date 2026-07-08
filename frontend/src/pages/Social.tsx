import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  Empty,
  Spin,
  Typography,
  Space,
  App,
} from 'antd'
import {
  PlusOutlined,
  LockOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  SafetyCertificateOutlined,
  CrownOutlined,
  ContactsOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import type { GroupOut } from '../api/types'

const { Title, Text, Paragraph } = Typography

export default function Social() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [createForm] = Form.useForm()
  const [joinForm] = Form.useForm()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: api.listGroups,
  })

  const createMut = useMutation({
    mutationFn: api.createGroup,
    onSuccess: () => {
      message.success('小组已创建')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setCreateOpen(false)
      createForm.resetFields()
    },
    onError: () => message.error('创建失败，请稍后重试'),
  })

  const joinMut = useMutation({
    mutationFn: (code: string) => api.joinGroup(code),
    onSuccess: () => {
      message.success('已加入小组')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setJoinOpen(false)
      joinForm.resetFields()
    },
    onError: () => message.error('加入失败，请检查邀请码是否正确'),
  })

  function copyCode(code: string) {
    navigator.clipboard
      ?.writeText(code)
      .then(() => message.success('邀请码已复制'))
      .catch(() => message.error('复制失败，请手动复制'))
  }

  return (
    <div className="lf-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          学习社区 · 同伴共学
        </Title>
        <Space>
          <Button icon={<UsergroupAddOutlined />} onClick={() => setJoinOpen(true)}>
            加入小组
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            创建小组
          </Button>
        </Space>
      </div>

      {/* methodology */}
      <Card style={{ marginBottom: 24, background: '#f0f7ff', borderColor: '#bae0ff' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={6}>
            <Space align="start">
              <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 18, marginTop: 2 }} />
              <div>
                <Text strong>归属感</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  找到同类，让学习不再孤单，提升持续动力。
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Space align="start">
              <ContactsOutlined style={{ color: '#8b5cf6', fontSize: 18, marginTop: 2 }} />
              <div>
                <Text strong>社会资本</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  关系网络沉淀为可调用的学习资源与机会。
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Space align="start">
              <CrownOutlined style={{ color: '#f59e0b', fontSize: 18, marginTop: 2 }} />
              <div>
                <Text strong>导师制</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  高阶成员带教，加速新手跨越能力曲线。
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Space align="start">
              <TeamOutlined style={{ color: '#10b981', fontSize: 18, marginTop: 2 }} />
              <div>
                <Text strong>同伴压力</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  适度竞争与互相督促，把惰性转化为行动。
                </Paragraph>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (groups ?? []).length === 0 ? (
        <Card>
          <Empty description="还没有小组，创建或加入一个开始共学吧">
            <Space>
              <Button icon={<UsergroupAddOutlined />} onClick={() => setJoinOpen(true)}>加入小组</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                创建小组
              </Button>
            </Space>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {groups?.map((g) => (
            <Col key={g.id} xs={24} sm={12} lg={8}>
              <Card
                title={
                  <Space>
                    <TeamOutlined style={{ color: '#2563eb' }} />
                    <Text strong>{g.name}</Text>
                    {g.is_private && <LockOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />}
                  </Space>
                }
                style={{ height: '100%' }}
              >
                <Paragraph type="secondary" style={{ minHeight: 40, marginBottom: 12 }}>
                  {g.description || '暂无简介'}
                </Paragraph>
                <Space size={6} wrap style={{ marginBottom: 12 }}>
                  {g.category && <Tag color="blue">{g.category}</Tag>}
                  <Tag icon={<TeamOutlined />}>{g.member_count} 人</Tag>
                  {g.is_private ? <Tag color="orange">私密</Tag> : <Tag color="green">公开</Tag>}
                </Space>
                {g.invite_code && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fafafa',
                      borderRadius: 6,
                      padding: '6px 10px',
                    }}
                  >
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>邀请码</Text>
                      <Text copyable={{ onCopy: () => copyCode(g.invite_code!) }} code style={{ fontSize: 13 }}>
                        {g.invite_code}
                      </Text>
                    </Space>
                    <Button type="link" size="small" onClick={() => copyCode(g.invite_code!)}>
                      复制
                    </Button>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* create modal */}
      <Modal
        title="创建小组"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={createMut.isPending}
        onOk={() => createForm.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(v) =>
            createMut.mutate({
              name: v.name,
              description: v.description,
              category: v.category,
              is_private: v.is_private,
            })
          }
          initialValues={{ is_private: false }}
        >
          <Form.Item name="name" label="小组名称" rules={[{ required: true, message: '请输入小组名称' }]}>
            <Input placeholder="例如：深度阅读同好会" />
          </Form.Item>
          <Form.Item name="description" label="简介">
            <Input.TextArea rows={3} placeholder="小组的学习目标与规则" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="例如：阅读 / 编程 / 语言" />
          </Form.Item>
          <Form.Item name="is_private" label="私密小组" valuePropName="checked">
            <Switch checkedChildren="私密" unCheckedChildren="公开" />
          </Form.Item>
        </Form>
      </Modal>

      {/* join modal */}
      <Modal
        title="加入小组"
        open={joinOpen}
        onCancel={() => setJoinOpen(false)}
        confirmLoading={joinMut.isPending}
        onOk={() => joinForm.submit()}
        okText="加入"
        cancelText="取消"
      >
        <Form form={joinForm} layout="vertical" onFinish={(v) => joinMut.mutate(v.invite_code)}>
          <Form.Item
            name="invite_code"
            label="邀请码"
            rules={[{ required: true, message: '请输入邀请码' }]}
          >
            <Input placeholder="输入小组邀请码" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            向小组创建者索取邀请码即可加入。
          </Text>
        </Form>
      </Modal>
    </div>
  )
}

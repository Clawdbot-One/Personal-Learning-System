import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ScheduleOutlined } from '@ant-design/icons'
import { api, ApiError } from '../api/client'
import type { PlanOut } from '../api/types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const ENGINE_OPTIONS: { label: string; value: string }[] = [
  { label: '刻意练习', value: 'deliberate_practice' },
  { label: '深度工作', value: 'deep_work' },
  { label: '海绵阅读', value: 'sponge_reading' },
  { label: '知行转化', value: 'knowledge_action' },
  { label: '批判思维', value: 'critical_thinking' },
]

const ENGINE_LABELS: Record<string, string> = Object.fromEntries(
  ENGINE_OPTIONS.map((o) => [o.value, o.label]),
)

const STATUS_COLORS: Record<string, string> = {
  active: 'processing',
  done: 'success',
  archived: 'default',
  paused: 'warning',
}

const STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  done: '已完成',
  archived: '已归档',
  paused: '已暂停',
}

interface PlanFormValues {
  title: string
  description?: string
  domain?: string
  enabled_engines?: string[]
  deadline?: dayjs.Dayjs
}

export default function Plans() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<PlanFormValues>()

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: api.listPlans,
  })

  const createMutation = useMutation({
    mutationFn: (values: PlanFormValues) =>
      api.createPlan({
        title: values.title,
        description: values.description,
        domain: values.domain,
        enabled_engines: values.enabled_engines,
        deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : undefined,
      }),
    onSuccess: () => {
      message.success('计划已创建')
      setOpen(false)
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '创建失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePlan(id),
    onSuccess: () => {
      message.success('计划已删除')
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '删除失败')
    },
  })

  function handleSubmit() {
    form.validateFields().then((values) => createMutation.mutate(values))
  }

  if (isLoading) {
    return (
      <div className="lf-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="lf-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ScheduleOutlined style={{ marginRight: 8 }} />
          学习计划
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          新建计划
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <Empty description="还没有学习计划，点击右上角创建一个吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[24, 24]}>
          {plans.map((p: PlanOut) => (
            <Col key={p.id} xs={24} md={12} lg={8}>
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text strong style={{ maxWidth: 220 }} ellipsis={{ tooltip: p.title }}>
                      {p.title}
                    </Text>
                    <Popconfirm
                      title="确定要删除该计划吗？"
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => deleteMutation.mutate(p.id)}
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                }
                extra={
                  <Tag color={STATUS_COLORS[p.status] ?? 'default'}>
                    {STATUS_LABELS[p.status] ?? p.status}
                  </Tag>
                }
              >
                {p.description && (
                  <Paragraph type="secondary" style={{ marginBottom: 12 }} ellipsis={{ rows: 2 }}>
                    {p.description}
                  </Paragraph>
                )}

                {p.domain && (
                  <div style={{ marginBottom: 12 }}>
                    <Tag color="blue">{p.domain}</Tag>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>进度</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{Math.round(p.progress * 100)}%</Text>
                  </div>
                  <Progress percent={Math.round(p.progress * 100)} showInfo={false} strokeColor="#2563eb" size="small" />
                </div>

                {p.enabled_engines.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>启用引擎：</Text>
                    <div style={{ marginTop: 4 }}>
                      {p.enabled_engines.map((e) => (
                        <Tag key={e} color="geekblue" style={{ marginBottom: 4 }}>
                          {ENGINE_LABELS[e] ?? e}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {p.deadline && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      截止日期：{dayjs(p.deadline).format('YYYY-MM-DD')}
                    </Text>
                  </div>
                )}

                {p.milestones.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>里程碑：</Text>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 4, listStyle: 'none' }}>
                      {p.milestones.map((m) => (
                        <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <input
                            type="checkbox"
                            checked={m.is_completed}
                            readOnly
                            style={{ accentColor: '#2563eb', cursor: 'default' }}
                          />
                          <Text
                            style={{ fontSize: 13 }}
                            delete={m.is_completed}
                            type={m.is_completed ? 'secondary' : undefined}
                          >
                            {m.title}
                          </Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    创建于 {dayjs(p.created_at).format('YYYY-MM-DD')}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="新建学习计划"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending}
        okText="创建"
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" initialValues={{ enabled_engines: ['deliberate_practice'] }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入计划标题' }]}>
            <Input placeholder="例如：掌握 TypeScript 高级特性" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="计划目标、范围等" />
          </Form.Item>
          <Form.Item name="domain" label="领域">
            <Input placeholder="例如：前端工程" />
          </Form.Item>
          <Form.Item name="enabled_engines" label="启用引擎">
            <Select mode="multiple" options={ENGINE_OPTIONS} placeholder="选择学习方法论引擎" />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

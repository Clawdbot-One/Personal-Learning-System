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
  Tag,
  Progress,
  Spin,
  Empty,
  Typography,
  Checkbox,
  Space,
  App,
} from 'antd'
import { PlusOutlined, BulbOutlined, CheckCircleOutlined, LinkOutlined } from '@ant-design/icons'
import { api } from '../api/client'
import type { ActionPlanOut } from '../api/types'

const { Title, Text, Paragraph } = Typography

const STATUS_COLOR: Record<string, string> = {
  active: 'processing',
  done: 'success',
  completed: 'success',
  archived: 'default',
}

const STATUS_LABEL: Record<string, string> = {
  active: '进行中',
  done: '已完成',
  completed: '已完成',
  archived: '已归档',
}

export default function Action() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['actionPlans'],
    queryFn: api.listActionPlans,
  })

  const createMut = useMutation({
    mutationFn: api.createActionPlan,
    onSuccess: () => {
      message.success('行动计划已创建，已自动生成 7 天行动清单')
      qc.invalidateQueries({ queryKey: ['actionPlans'] })
      setOpen(false)
      form.resetFields()
    },
    onError: () => message.error('创建失败，请稍后重试'),
  })

  const toggleMut = useMutation({
    mutationFn: (vars: { planId: string; itemId: string; isDone: boolean }) =>
      api.toggleActionItem(vars.planId, vars.itemId, vars.isDone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actionPlans'] }),
    onError: () => message.error('更新失败，请稍后重试'),
  })

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
          知行转化 · 7 天行动计划
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          新建行动计划
        </Button>
      </div>

      {/* methodology */}
      <Card style={{ marginBottom: 24, background: '#f0f7ff', borderColor: '#bae0ff' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Space align="start">
              <BulbOutlined style={{ color: '#52c41a', fontSize: 20, marginTop: 2 }} />
              <div>
                <Text strong>绿灯思维</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  先接纳新观点的可行之处，再进行批判。把“我能怎么用”放在“这有什么问题”之前。
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <LinkOutlined style={{ color: '#2563eb', fontSize: 20, marginTop: 2 }} />
              <div>
                <Text strong>费曼输出</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  用最简单的语言把概念讲给别人听，讲不清的地方就是理解的盲区，再回头补足。
                </Paragraph>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space align="start">
              <CheckCircleOutlined style={{ color: '#fa8c16', fontSize: 20, marginTop: 2 }} />
              <div>
                <Text strong>知行断裂诊断</Text>
                <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  知道却做不到，往往源于洞察模糊、缺少最小行动或反馈缺失。先提炼一句核心洞察，再拆成 7 天可执行小步。
                </Paragraph>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {plans && plans.length === 0 ? (
        <Card>
          <Empty description="还没有行动计划，点击右上角创建第一个吧">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              新建行动计划
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {plans?.map((plan) => (
            <Col key={plan.id} xs={24} lg={12}>
              <ActionPlanCard
                plan={plan}
                onToggle={(itemId, isDone) =>
                  toggleMut.mutate({ planId: plan.id, itemId, isDone })
                }
                disabled={toggleMut.isPending}
              />
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="新建行动计划"
        open={open}
        onCancel={() => setOpen(false)}
        confirmLoading={createMut.isPending}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            createMut.mutate({
              title: v.title,
              source_concept: v.source_concept,
              insight: v.insight,
            })
          }
        >
          <Form.Item
            name="title"
            label="行动标题"
            rules={[{ required: true, message: '请输入行动标题' }]}
          >
            <Input placeholder="例如：每天用费曼法讲透一个概念" />
          </Form.Item>
          <Form.Item name="source_concept" label="来源概念">
            <Input placeholder="这个行动源自哪个知识/概念" />
          </Form.Item>
          <Form.Item name="insight" label="提炼核心洞察" tooltip="一句话讲清你从知识中得到的可行动洞察">
            <Input.TextArea rows={3} placeholder="提炼一句核心洞察，例如：输出倒逼输入，讲不清即未理解" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提交后系统会自动生成 7 天逐日行动清单，你可逐项勾选完成。
          </Text>
        </Form>
      </Modal>
    </div>
  )
}

function ActionPlanCard({
  plan,
  onToggle,
  disabled,
}: {
  plan: ActionPlanOut
  onToggle: (itemId: string, isDone: boolean) => void
  disabled: boolean
}) {
  const items = [...plan.items].sort((a, b) => a.day - b.day)
  const doneCount = items.filter((i) => i.is_done).length

  return (
    <Card
      title={
        <Space>
          <Text strong>{plan.title}</Text>
          <Tag color={STATUS_COLOR[plan.status] ?? 'default'}>
            {STATUS_LABEL[plan.status] ?? plan.status}
          </Tag>
        </Space>
      }
      style={{ height: '100%' }}
    >
      {plan.source_concept && (
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">来源概念：</Text>
          <Tag color="blue">{plan.source_concept}</Tag>
        </div>
      )}

      {plan.insight && (
        <div
          style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
          }}
        >
          <Space align="start">
            <BulbOutlined style={{ color: '#faad14', marginTop: 3 }} />
            <Text italic style={{ color: '#614700' }}>
              {plan.insight}
            </Text>
          </Space>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            进度
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {doneCount}/{items.length} 天
          </Text>
        </div>
        <Progress percent={plan.progress} size="small" strokeColor="#52c41a" />
      </div>

      {/* 7-day vertical timeline checklist */}
      <div style={{ position: 'relative' }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', gap: 12, paddingBottom: idx === items.length - 1 ? 0 : 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: item.is_done ? '#52c41a' : '#f0f0f0',
                  color: item.is_done ? '#fff' : '#8c8c8c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                D{item.day}
              </div>
              {idx !== items.length - 1 && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    background: item.is_done ? '#52c41a' : '#f0f0f0',
                    minHeight: 14,
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 2, paddingTop: 3 }}>
              <Checkbox
                checked={item.is_done}
                disabled={disabled}
                onChange={(e) => onToggle(item.id, e.target.checked)}
                style={{ width: '100%' }}
              >
                <Text
                  delete={item.is_done}
                  style={{ color: item.is_done ? '#bfbfbf' : 'inherit' }}
                >
                  {item.content}
                </Text>
              </Checkbox>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

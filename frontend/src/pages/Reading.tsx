import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined, BookOutlined, StarFilled } from '@ant-design/icons'
import { api, ApiError } from '../api/client'
import type { BookOut, NoteOut } from '../api/types'

const { Title, Text, Paragraph } = Typography

const STATUS_COLORS: Record<string, string> = {
  reading: 'processing',
  done: 'success',
  abandoned: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  reading: '阅读中',
  done: '已读',
  abandoned: '放弃',
}

const STAGE_LABELS: Record<number, string> = {
  1: '检视阅读',
  2: '分析阅读',
  3: '主题阅读',
  4: '输出转化',
}

const LAYER_LABELS: Record<number, string> = {
  1: '片段笔记',
  2: '章节笔记',
  3: '全书笔记',
}

const LAYER_COLORS: Record<number, string> = {
  1: 'blue',
  2: 'purple',
  3: 'gold',
}

const LAYER_OPTIONS: { label: string; value: number }[] = [
  { label: '片段笔记（Layer 1）', value: 1 },
  { label: '章节笔记（Layer 2）', value: 2 },
  { label: '全书笔记（Layer 3）', value: 3 },
]

interface BookFormValues {
  title: string
  author?: string
  total_pages?: number
}

interface NoteFormValues {
  layer: number
  content: string
  page_ref?: string
  tags?: string[]
  is_highlight: boolean
}

export default function Reading() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [currentBook, setCurrentBook] = useState<BookOut | null>(null)
  const [bookForm] = Form.useForm<BookFormValues>()
  const [noteForm] = Form.useForm<NoteFormValues>()

  const { data: books, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: api.listBooks,
  })

  const { data: notes, isFetching: notesLoading } = useQuery({
    queryKey: ['notes', currentBook?.id],
    queryFn: () => (currentBook ? api.listNotes(currentBook.id) : Promise.resolve([])),
    enabled: !!currentBook,
  })

  const addBookMutation = useMutation({
    mutationFn: (values: BookFormValues) =>
      api.addBook({
        title: values.title,
        author: values.author,
        total_pages: values.total_pages,
      }),
    onSuccess: () => {
      message.success('书籍已添加')
      setBookModalOpen(false)
      bookForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '添加失败')
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: (values: NoteFormValues) => {
      if (!currentBook) throw new Error('no book')
      return api.addNote({
        book_id: currentBook.id,
        layer: values.layer,
        content: values.content,
        page_ref: values.page_ref,
        tags: values.tags,
        is_highlight: values.is_highlight,
      })
    },
    onSuccess: () => {
      message.success('笔记已添加')
      setNoteModalOpen(false)
      noteForm.resetFields()
      if (currentBook) {
        queryClient.invalidateQueries({ queryKey: ['notes', currentBook.id] })
      }
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '添加失败')
    },
  })

  function openBook(book: BookOut) {
    setCurrentBook(book)
  }

  // Group notes by layer
  const notesByLayer: Record<number, NoteOut[]> = { 1: [], 2: [], 3: [] }
  ;(notes ?? []).forEach((n) => {
    if (!notesByLayer[n.layer]) notesByLayer[n.layer] = []
    notesByLayer[n.layer].push(n)
  })

  return (
    <div className="lf-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          <BookOutlined style={{ marginRight: 8 }} />
          海绵阅读 · 三层笔记
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setBookModalOpen(true)}>
          添加书籍
        </Button>
      </div>

      <Row gutter={24}>
        {/* Book list */}
        <Col xs={24} lg={16}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : !books || books.length === 0 ? (
            <Empty description="还没有书籍，点击右上角添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Row gutter={[16, 16]}>
              {books.map((b) => {
                const pct = b.total_pages ? Math.min(100, Math.round((b.current_page / b.total_pages) * 100)) : 0
                return (
                  <Col key={b.id} xs={24} md={12}>
                    <Card hoverable onClick={() => openBook(b)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong style={{ fontSize: 15 }}>{b.title}</Text>
                          {b.author && (
                            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                              {b.author}
                            </div>
                          )}
                        </div>
                        <Tag color={STATUS_COLORS[b.status] ?? 'default'}>
                          {STATUS_LABELS[b.status] ?? b.status}
                        </Tag>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {b.current_page}{b.total_pages ? ` / ${b.total_pages}` : ''} 页
                          </Text>
                          <Tag color="blue" style={{ fontSize: 11 }}>
                            阶段 {b.stage} · {STAGE_LABELS[b.stage] ?? '未知'}
                          </Tag>
                        </div>
                        <Progress percent={pct} size="small" showInfo={false} strokeColor="#2563eb" />
                      </div>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Col>

        {/* Methodology card */}
        <Col xs={24} lg={8}>
          <Card title="三层笔记 · 四阶段阅读" style={{ height: '100%' }}>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              源自《海绵阅读法》—— 用三层笔记贯穿四阶段阅读，从碎片到体系。
            </Paragraph>
            <Text strong>三层笔记</Text>
            <ul style={{ margin: '6px 0 12px', paddingLeft: 18, fontSize: 13, color: '#374151' }}>
              <li><Tag color="blue">Layer 1</Tag> 片段笔记：摘录与即时感受</li>
              <li><Tag color="purple">Layer 2</Tag> 章节笔记：归纳章节要点</li>
              <li><Tag color="gold">Layer 3</Tag> 全书笔记：提炼核心论点与结构</li>
            </ul>
            <Text strong>四阶段阅读</Text>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: '#374151' }}>
              <li>检视阅读：快速建立全书框架</li>
              <li>分析阅读：深入理解论证脉络</li>
              <li>主题阅读：跨书比较主题</li>
              <li>输出转化：写文章 / 实践</li>
            </ol>
          </Card>
        </Col>
      </Row>

      {/* Book detail drawer */}
      <Drawer
        title={currentBook?.title}
        open={!!currentBook}
        onClose={() => setCurrentBook(null)}
        width={620}
        extra={
          <Button icon={<PlusOutlined />} onClick={() => setNoteModalOpen(true)}>添加笔记</Button>
        }
      >
        {currentBook && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space wrap>
                <Tag color={STATUS_COLORS[currentBook.status] ?? 'default'}>
                  {STATUS_LABELS[currentBook.status] ?? currentBook.status}
                </Tag>
                <Tag color="blue">阶段 {currentBook.stage} · {STAGE_LABELS[currentBook.stage] ?? '未知'}</Tag>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {currentBook.current_page}{currentBook.total_pages ? ` / ${currentBook.total_pages}` : ''} 页
                </Text>
              </Space>
            </Card>

            {notesLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : !notes || notes.length === 0 ? (
              <Empty description="还没有笔记，添加第一则笔记吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {[1, 2, 3].map((layer) => {
                  const layerNotes = notesByLayer[layer]
                  if (!layerNotes || layerNotes.length === 0) return null
                  return (
                    <Card
                      key={layer}
                      size="small"
                      title={
                        <Space>
                          <Tag color={LAYER_COLORS[layer]}>{`Layer ${layer}`}</Tag>
                          <Text strong style={{ fontSize: 14 }}>{LAYER_LABELS[layer]}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{layerNotes.length} 则</Text>
                        </Space>
                      }
                    >
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {layerNotes.map((n) => (
                          <div key={n.id} style={{ padding: '8px 10px', background: n.is_highlight ? '#fffbeb' : '#f9fafb', borderRadius: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              {n.is_highlight && <StarFilled style={{ color: '#f59e0b', fontSize: 12 }} />}
                              <div style={{ marginLeft: 'auto' }}>
                                {n.page_ref && <Tag style={{ fontSize: 11 }}>P.{n.page_ref}</Tag>}
                              </div>
                            </div>
                            <Paragraph style={{ margin: 0, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>
                              {n.content}
                            </Paragraph>
                            {n.tags.length > 0 && (
                              <div style={{ marginTop: 6 }}>
                                {n.tags.map((t) => (
                                  <Tag key={t} style={{ fontSize: 11 }}>{t}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </Space>
                    </Card>
                  )
                })}
              </Space>
            )}
          </div>
        )}
      </Drawer>

      {/* Add book modal */}
      <Modal
        title="添加书籍"
        open={bookModalOpen}
        onCancel={() => setBookModalOpen(false)}
        onOk={() => bookForm.validateFields().then((v) => addBookMutation.mutate(v))}
        confirmLoading={addBookMutation.isPending}
        okText="添加"
        cancelText="取消"
      >
        <Form form={bookForm} layout="vertical">
          <Form.Item name="title" label="书名" rules={[{ required: true, message: '请输入书名' }]}>
            <Input placeholder="例如：深度工作" />
          </Form.Item>
          <Form.Item name="author" label="作者">
            <Input placeholder="例如：卡尔·纽波特" />
          </Form.Item>
          <Form.Item name="total_pages" label="总页数">
            <InputNumber min={1} max={10000} style={{ width: '100%' }} placeholder="例如：280" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add note modal */}
      <Modal
        title={`添加笔记 · ${currentBook?.title ?? ''}`}
        open={noteModalOpen}
        onCancel={() => setNoteModalOpen(false)}
        onOk={() => noteForm.validateFields().then((v) => addNoteMutation.mutate(v))}
        confirmLoading={addNoteMutation.isPending}
        okText="添加"
        cancelText="取消"
      >
        <Form form={noteForm} layout="vertical" initialValues={{ layer: 1, is_highlight: false }}>
          <Form.Item name="layer" label="笔记层级" rules={[{ required: true }]}>
            <Select options={LAYER_OPTIONS} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入笔记内容' }]}>
            <Input.TextArea rows={5} placeholder="输入笔记内容…" />
          </Form.Item>
          <Form.Item name="page_ref" label="页码">
            <Input placeholder="例如：42" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="按回车添加标签" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="is_highlight" label="标记为金句" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

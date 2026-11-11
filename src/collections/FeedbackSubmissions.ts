import type { Access, CollectionConfig, FieldAccess } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'
const isAdminField: FieldAccess = ({ req }) => req.user?.collection === 'admins'

export const FeedbackSubmissions: CollectionConfig = {
  slug: 'feedback-submissions',
  labels: {
    singular: 'Phản hồi',
    plural: 'Phản hồi người dùng',
  },
  admin: {
    group: 'Vận hành',
    useAsTitle: 'message',
    defaultColumns: ['category', 'status', 'contact', 'createdAt'],
  },
  access: {
    create: () => true,
    delete: isAdmin,
    read: isAdmin,
    update: isAdmin,
  },
  fields: [
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Góp ý', value: 'suggestion' },
        { label: 'Báo lỗi', value: 'bug' },
        { label: 'Nội dung', value: 'content' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      minLength: 10,
      maxLength: 2000,
    },
    {
      name: 'contact',
      type: 'text',
      maxLength: 160,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      required: true,
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      options: [
        { label: 'Mới', value: 'new' },
        { label: 'Đang xử lý', value: 'reviewing' },
        { label: 'Đã giải quyết', value: 'resolved' },
      ],
    },
  ],
}

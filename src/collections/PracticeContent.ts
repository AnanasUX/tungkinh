import type { Access, CollectionConfig } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'

export const PracticeContent: CollectionConfig = {
  slug: 'practice-content',
  labels: {
    singular: 'Nội dung công phu',
    plural: 'Nội dung công phu',
  },
  admin: {
    group: 'Chùa Sen',
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'durationMinutes', 'featured'],
  },
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: 140,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Tụng kinh', value: 'chant' },
        { label: 'Pháp thoại', value: 'talk' },
        { label: 'Niệm Phật', value: 'recitation' },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 360,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      maxLength: 12000,
      admin: {
        description: 'Mỗi đoạn hoặc câu tụng đặt trên một dòng.',
      },
    },
    {
      name: 'teacher',
      type: 'text',
      maxLength: 100,
    },
    {
      name: 'durationMinutes',
      type: 'number',
      min: 1,
      max: 240,
      defaultValue: 10,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
  ],
}

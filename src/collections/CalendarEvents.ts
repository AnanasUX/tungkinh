import type { Access, CollectionConfig } from 'payload'

const isAdmin: Access = ({ req }) => req.user?.collection === 'admins'

export const CalendarEvents: CollectionConfig = {
  slug: 'calendar-events',
  labels: {
    singular: 'Ngày Phật sự',
    plural: 'Lịch Phật sự',
  },
  admin: {
    group: 'Chùa Sen',
    useAsTitle: 'title',
    defaultColumns: ['title', 'lunarDate', 'eventType', 'time'],
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
      name: 'lunarDate',
      type: 'text',
      required: true,
      maxLength: 60,
    },
    {
      name: 'eventType',
      type: 'select',
      required: true,
      options: [
        { label: 'Ngày sóc vọng', value: 'lunar' },
        { label: 'Ngày lễ', value: 'festival' },
        { label: 'Công phu chung', value: 'practice' },
      ],
    },
    {
      name: 'time',
      type: 'text',
      maxLength: 20,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
  ],
}

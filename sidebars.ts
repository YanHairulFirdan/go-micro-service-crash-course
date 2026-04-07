import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
        title: 'Getting Started',
        description: 'Orientasi awal sebelum masuk ke jalur belajar utama.',
      },
      items: [
        {
          type: 'doc',
          id: 'getting-started/instalasi',
          label: 'Instalasi',
        },
        {
          type: 'doc',
          id: 'getting-started/pengenalan',
          label: 'Pengenalan',
        },
      ],
    },
    {
      type: 'category',
      label: 'Learning Path',
      link: {
        type: 'generated-index',
        title: 'Learning Path',
        description:
          'Perjalanan belajar 7 hari yang dibangun bertahap dari service pertama sampai integrasi akhir.',
      },
      items: [
        {
          type: 'doc',
          id: 'learning-path/hari-1-setup-product-service',
          label: 'Hari 1 — Setup Product Service',
        },
        {
          type: 'doc',
          id: 'learning-path/hari-2-order-service-protobuf',
          label: 'Hari 2 — Order Service dan Protobuf',
        },
        {
          type: 'doc',
          id: 'learning-path/hari-3-grpc-communication',
          label: 'Hari 3 — gRPC Communication',
        },
        {
          type: 'doc',
          id: 'learning-path/hari-4-kafka-event-streaming',
          label: 'Hari 4 — Kafka Event Streaming',
        },
        {
          type: 'doc',
          id: 'learning-path/hari-5-api-gateway',
          label: 'Hari 5 — API Gateway',
        },
        {
          type: 'doc',
          id: 'learning-path/hari-6-docker-compose',
          label: 'Hari 6 — Docker Compose',
        },
        {
          type: 'doc',
          id: 'learning-path/hari-7-integrasi-testing',
          label: 'Hari 7 — Integrasi dan Testing',
        },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: {
        type: 'generated-index',
        title: 'Reference',
        description: 'Rujukan istilah dan konsep yang dipakai sepanjang course.',
      },
      items: ['reference/glosarium'],
    },
  ],
};

export default sidebars;

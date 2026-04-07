import type {Config} from '@docusaurus/types';

const config: Config = {
  title: 'Panduan Microservices Go',
  tagline: 'Course 7 hari: Fiber, gRPC, Kafka, dan Docker Compose',
  url: 'https://yanhairulfirdan.github.io',
  baseUrl: '/go-micro-service-crash-course/',
  organizationName: 'YanHairulFirdan',
  projectName: 'go-micro-service-crash-course',
  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'id',
    locales: ['id'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Panduan Microservices Go',
      items: [
        {
          to: '/docs',
          label: 'Mulai',
          position: 'left',
        },
        {
          to: '/docs/getting-started/pengenalan',
          label: 'Pengenalan',
          position: 'left',
        },
        {
          to: '/docs/getting-started/instalasi',
          label: 'Instalasi',
          position: 'left',
        },
        {
          to: '/docs/category/learning-path',
          label: 'Learning Path',
          position: 'left',
        },
        {
          to: '/docs/category/reference',
          label: 'Reference',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Mulai',
              to: '/docs',
            },
            {
              label: 'Pengenalan',
              to: '/docs/getting-started/pengenalan',
            },
            {
              label: 'Instalasi',
              to: '/docs/getting-started/instalasi',
            },
            {
              label: 'Learning Path',
              to: '/docs/category/learning-path',
            },
            {
              label: 'Reference',
              to: '/docs/category/reference',
            },
          ],
        },
      ],
      copyright: `Built with Docusaurus`,
    },
  },
};

export default config;

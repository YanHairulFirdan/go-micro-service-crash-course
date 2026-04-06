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
          to: '/docs/intro',
          label: 'Arsitektur',
          position: 'left',
        },
        {
          to: '/docs/hari-1/setup-product-service',
          label: 'Course',
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
              label: 'Instalasi',
              to: '/docs/instalasi',
            },
            {
              label: 'Pendahuluan',
              to: '/docs/intro',
            },
          ],
        },
      ],
      copyright: `Built with Docusaurus`,
    },
  },
};

export default config;

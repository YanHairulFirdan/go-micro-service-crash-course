import type {JSX} from 'react';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  return (
    <main className="hero">
      <section className="hero__inner wrapper">
        <p className="eyebrow">Course 7 Hari</p>
        <h1>Panduan Belajar Microservices dengan Go</h1>
        <p className="lead">
          Materi berurutan dari instalasi, product service, protobuf, gRPC,
          Kafka, API gateway, sampai Docker Compose dan integrasi.
        </p>
        <div className="actions">
          <Link className="button button--primary button--lg" to="/docs/instalasi">
            Mulai dari Instalasi
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Lihat Arsitektur
          </Link>
        </div>
      </section>
    </main>
  );
}

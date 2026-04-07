import type {JSX} from 'react';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  return (
    <main className="hero">
      <section className="hero__inner wrapper">
        <p className="eyebrow">Course 7 Hari</p>
        <h1>Panduan Belajar Microservices dengan Go</h1>
        <p className="lead">
          Bangun backend e-commerce sederhana dengan Go, Fiber, gRPC, Kafka,
          API Gateway, dan Docker Compose dalam alur belajar yang berurutan dan
          praktis.
        </p>
        <div className="actions">
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started/instalasi">
            Mulai dari Instalasi
          </Link>
          <Link className="button button--secondary button--lg" to="/docs">
            Lihat Struktur Course
          </Link>
        </div>
        <div className="hero-grid">
          <article className="hero-card">
            <h2>Yang Akan Kamu Bangun</h2>
            <ul>
              <li>Product Service untuk produk dan stok</li>
              <li>Order Service untuk pembuatan order</li>
              <li>API Gateway sebagai pintu masuk request</li>
              <li>Integrasi gRPC, Kafka, dan Docker Compose</li>
            </ul>
          </article>
          <article className="hero-card">
            <h2>Yang Akan Kamu Pelajari</h2>
            <ul>
              <li>REST API dengan Fiber v3</li>
              <li>GORM dan PostgreSQL</li>
              <li>Komunikasi sinkron dan asinkron antar-service</li>
              <li>Deployment lokal berbasis container</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}

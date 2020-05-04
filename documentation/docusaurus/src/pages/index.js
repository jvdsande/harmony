import React, { useState, useEffect, useCallback } from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: <>Data-centric</>,
    imageUrl: 'img/undraw_data-centric.svg',
    description: (
      <>
        HarmonyJS is a data-first framework: define your models, we take care of the rest
      </>
    ),
  },
  {
    title: <>Fully JavaScript</>,
    imageUrl: 'img/undraw_web-development.svg',
    description: (
      <>
        JavaScript in the backend, JavaScript in the frontend: one language to rule them all
      </>
    ),
  },
  {
    title: <>Reactive at its core</>,
    imageUrl: 'img/undraw_real-time.svg',
    description: (
      <>
        Integrated websocket server for instant client-server synchronization
      </>
    ),
  },
];

function Feature({imageUrl, title, description}) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function useDarkThemeDetector() {
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  const onClickListener = useCallback(() => {
    const html = document.getElementsByTagName("html")[0]
    setIsDarkTheme(html.getAttribute('data-theme') === 'dark')
  })

  useEffect(() => {
    onClickListener()
    window.addEventListener("click", onClickListener)
    return () => window.removeEventListener("click", onClickListener)
  }, [])

  return isDarkTheme
}

function Home() {
  const context = useDocusaurusContext();
  const isDarkTheme = useDarkThemeDetector();
  const {siteConfig = {}} = context;
  return (
    <Layout
      description="HarmonyJS Documentation Website">
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 style={{marginBottom: 0}} className="hero__title">
            <img alt="HarmonyJS" src={isDarkTheme ? "/img/logo-type-black.svg" : "/img/logo-type-white.svg"} height="140px" />
          </h1>
          <p className="hero__subtitle">{siteConfig.tagline}{isDarkTheme ? "true" : "false"}</p>
          <div className={styles.buttons}>
            <Link
              className={classnames(
                'button button--secondary button--lg',
              )}
              to={useBaseUrl('docs/guides')}>
              Get Started
            </Link>
            &nbsp;&nbsp;
            <Link
              className={classnames(
                'button button--lg',
              )}
              to={useBaseUrl('docs/api')}>
              API Reference
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

export default Home;

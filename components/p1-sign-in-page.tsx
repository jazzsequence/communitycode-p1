"use client";

import { Icon } from "@pantheon-systems/pds-toolkit-react";
import { useP1Auth } from "@pantheon-systems/puck-css";

import { P1Lockup } from "./p1-lockup";
import styles from "./welcome-block.module.css";

export function P1SignInPage() {
  const { login, isLoading, error } = useP1Auth();

  return (
    <div className={styles.surface}>
      <div className={styles.inner}>
        <P1Lockup />

        <h1 className={styles.title}>Welcome to P1 Visual Editor</h1>

        <div className={styles.actions}>
          <button
            className={styles.button}
            onClick={() => void login()}
            disabled={isLoading}
          >
            {!isLoading && <Icon iconName="arrowRight" aria-hidden="true" />}
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        <p className={`${styles.description} ${styles.note}`}>
          Don&rsquo;t have access yet?{" "}
          <a href="https://p1.pantheon.io" className={styles.link}>Learn about P1</a>
        </p>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

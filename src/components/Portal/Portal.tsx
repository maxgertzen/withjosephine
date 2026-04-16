import styles from "./Portal.module.css";

export function Portal() {
  return (
    <div className={styles.wrapper} aria-hidden="true">
      <div className={styles.aura} />
      <div className={styles.geometry} />
      <div className={styles.portal}>
        <div className={styles.core}>
          <div className={styles.stars} />
        </div>
      </div>
      <div className={styles.ripples}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

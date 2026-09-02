import sharedStyles from "./shared.module.css";
import styles from "./PageHeaderBlock.module.css";

/** The mono-label + heading + rule block every inner page opens with. */
export function PageHeaderBlock({ label, heading }: { label: string; heading: string }) {
  return (
    <div className={styles.wrap}>
      <span className={sharedStyles.monoLabel}>{label}</span>
      <h1 className={styles.heading}>{heading}</h1>
      <div className={styles.rule} />
    </div>
  );
}

import styles from "./Badge.module.css";

interface BadgeProps {
  variant?: "default" | "success" | "error" | "accent";
  children: React.ReactNode;
}

export function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}

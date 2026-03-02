import styles from "./Card.module.css";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
}

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]} ${className ?? ""}`} {...props}>
      {children}
    </div>
  );
}

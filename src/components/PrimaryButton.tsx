import type { ButtonHTMLAttributes } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export default function PrimaryButton({
  variant = 'primary',
  className = '',
  ...rest
}: PrimaryButtonProps) {
  return <button className={`btn btn--${variant} ${className}`.trim()} {...rest} />;
}

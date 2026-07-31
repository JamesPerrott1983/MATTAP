interface ErrorMessageProps {
  title?: string;
  message: string;
}

export default function ErrorMessage({ title = 'Something went wrong', message }: ErrorMessageProps) {
  return (
    <div className="overlay overlay--error" role="alert">
      <div className="error-card">
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}

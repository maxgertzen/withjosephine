import { AUTH_SIGN_OUT_ROUTE } from "@/lib/http/routes";

type Props = {
  className?: string;
  buttonClassName?: string;
  children?: React.ReactNode;
};

export function SignOutForm({ className, buttonClassName, children = "Sign out" }: Props) {
  return (
    <form action={AUTH_SIGN_OUT_ROUTE} method="post" className={className}>
      <button type="submit" className={buttonClassName}>
        {children}
      </button>
    </form>
  );
}

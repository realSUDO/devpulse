import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Terminal, Crosshair } from "lucide-react"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <Terminal className="size-8 mb-6" />
      <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase mb-3">
        DevPulse
      </p>
      <h1 className="text-4xl font-semibold tracking-tight mb-4 max-w-md leading-tight">
        Your GitHub profile,<br />deeply analyzed.
      </h1>
      <p className="font-mono text-xs text-muted-foreground max-w-xs mb-8 leading-relaxed">
        Real stats · Language breakdown · Activity feed<br />AI-powered insights via Llama 3.3
      </p>
      <div className="flex gap-3">
        <Link href="/signin" className={buttonVariants({ variant: "default" })}>
          Get started →
        </Link>
        <Link href="/compare" className={buttonVariants({ variant: "outline" })}>
          <Crosshair className="size-3.5" /> Compare
        </Link>
      </div>
      <p className="font-mono text-xs text-muted-foreground mt-12">
        no account · just your github username
      </p>
    </div>
  )
}

"use client"

import { useAuth } from "@better-auth-ui/react"
import { Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import QRCode from "react-qr-code"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient as typedAuthClient } from "@/lib/auth/client"

export type TwoFactorViewProps = {
  className?: string
}

export function TwoFactorView({ className }: TwoFactorViewProps) {
  const { navigate, redirectTo } = useAuth()
  const searchParams = useSearchParams()
  const totpURI = searchParams.get("totpURI")

  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const submit = useCallback(
    async (submitCode: string) => {
      if (submitCode.length < 6 || isPending) return

      setIsPending(true)
      try {
        const { error } = await typedAuthClient.twoFactor.verifyTotp({
          code: submitCode,
          trustDevice
        })
        if (error) {
          toast.error(error.message || "Invalid code. Please try again.")
          setCode("")
          return
        }
        navigate({ to: redirectTo })
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Invalid code. Please try again."
        )
        setCode("")
      } finally {
        setIsPending(false)
      }
    },
    [isPending, trustDevice, navigate, redirectTo]
  )

  const handleOtpChange = (value: string) => {
    setCode(value)
  }

  return (
    <Card className={cn("w-full max-w-sm", className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(code)
          }}
          className="flex flex-col gap-6"
        >
          {totpURI ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with your authenticator app, then enter the
                6-digit code below.
              </p>
              <QRCode
                className="border p-2 rounded-md"
                value={totpURI}
                size={160}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Enter the 6-digit code from your authenticator app.
            </p>
          )}

          <div className="flex flex-col items-center gap-2">
            <Label htmlFor="otp-code">One-Time Password</Label>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => handleOtpChange(e.target.value.replace(/\D/g, ""))}
              disabled={isPending}
              className="w-40 text-center text-2xl font-mono tracking-[0.5em] pl-[0.5em]"
              autoFocus
            />
          </div>

          {!totpURI && (
            <div className="flex flex-row items-center gap-3">
              <Checkbox
                id="trustDevice"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
                disabled={isPending}
              />
              <Label
                htmlFor="trustDevice"
                className="cursor-pointer font-normal"
              >
                Trust this device
              </Label>
            </div>
          )}

          <Button type="submit" disabled={isPending || code.length < 6}>
            {isPending && <Loader2 className="animate-spin" />}
            Verify
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

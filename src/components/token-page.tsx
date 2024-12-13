'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function TokenPage() {
  const [steelAmount, setSteelAmount] = useState('')
  const [energyAmount, setEnergyAmount] = useState('')
  const [lastTxHash, setLastTxHash] = useState<Record<string, string>>({
    steel: '',
    energy: ''
  })

  const handleBuy = async (tokenType: 'steel' | 'energy') => {
    // Simulate transaction
    const hash = `0x${Math.random().toString(16).slice(2)}...`
    setLastTxHash(prev => ({
      ...prev,
      [tokenType]: hash
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 text-white">ZeroCraft Tokens</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* MinaSteel Token Card */}
          <Card className="bg-gradient-to-b from-zinc-900 to-zinc-800 border-zinc-700 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">MinaSteel Token</CardTitle>
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MinaSteel-sV4fOOngFlCK7GiAfMz5BCXG5fRqea.png"
                  alt="MinaSteel Token"
                  fill
                  className="object-contain"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="steel-amount" className="text-gray-300">Amount to Buy</Label>
                <Input
                  id="steel-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={steelAmount}
                  onChange={(e) => setSteelAmount(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">Your Balance</p>
                <p className="text-xl font-bold">1,000 STEEL</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                onClick={() => handleBuy('steel')}
                className="w-full bg-zinc-700 hover:bg-zinc-600"
              >
                Buy MinaSteel
              </Button>
              {lastTxHash.steel && (
                <div className="text-sm text-gray-400 break-all">
                  Last TX: {lastTxHash.steel}
                </div>
              )}
            </CardFooter>
          </Card>

          {/* MinaEnergy Token Card */}
          <Card className="bg-gradient-to-b from-cyan-900 to-cyan-950 border-cyan-800 text-white">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-4">MinaEnergy Token</CardTitle>
              <div className="relative w-48 h-48 mx-auto">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/MinaEnergy-ldoDQVbTioYcMJ0YSFpuS1KwBrxkBS.png"
                  alt="MinaEnergy Token"
                  fill
                  className="object-contain"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="energy-amount" className="text-gray-300">Amount to Buy</Label>
                <Input
                  id="energy-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={energyAmount}
                  onChange={(e) => setEnergyAmount(e.target.value)}
                  className="bg-cyan-900 border-cyan-800 text-white"
                />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">Your Balance</p>
                <p className="text-xl font-bold">2,500 ENERGY</p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                onClick={() => handleBuy('energy')}
                className="w-full bg-cyan-700 hover:bg-cyan-600"
              >
                Buy MinaEnergy
              </Button>
              {lastTxHash.energy && (
                <div className="text-sm text-gray-400 break-all">
                  Last TX: {lastTxHash.energy}
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}


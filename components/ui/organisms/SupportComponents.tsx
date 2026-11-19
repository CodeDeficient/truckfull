import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SupportContactCards() {
  return (
    <>
      <Card className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white text-lg font-bold mb-2">Email Support</h3>
          <p className="text-gray-300 mb-4">Get in touch with our support team via email</p>
          <Button className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90">
            Send Email
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white text-lg font-bold mb-2">Live Chat</h3>
          <p className="text-gray-300 mb-4">Chat with our support team in real-time</p>
          <Button className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90">
            Start Chat
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white text-lg font-bold mb-2">Phone Support</h3>
          <p className="text-gray-300 mb-4">Speak with a support representative</p>
          <Button className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90">
            Call Now
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export function OwnerResources() {
  return (
    <>
      <Card className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white text-lg font-bold mb-2">Getting Started</h3>
          <p className="text-gray-300 mb-4">Learn how to set up your food truck profile</p>
          <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
            View Guide
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white text-lg font-bold mb-2">Marketing Tools</h3>
          <p className="text-gray-300 mb-4">Promote your food truck to more customers</p>
          <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
            View Tools
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
        <CardContent className="p-4">
          <h3 className="text-white text-lg font-bold mb-2">Analytics Dashboard</h3>
          <p className="text-gray-300 mb-4">Track your performance and customer engagement</p>
          <Button variant="outline" className="w-full text-white border-white/20 hover:bg-white/10">
            View Analytics
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

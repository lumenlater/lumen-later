'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Key,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useWallet } from '@/hooks/web3/use-wallet';
import { generateApiKeyMessage } from '@/lib/auth/stellar-signature';

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  last_used_at: string | null;
  expires_at: string;
  created_at: string;
  is_expired: boolean;
  is_revoked: boolean;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { publicKey, isConnected } = useWallet();

  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Refetch helper
  const refetchKeys = () => setRefetchTrigger((prev) => prev + 1);

  // Fetch API keys (no signature required - only metadata)
  useEffect(() => {
    if (!isConnected || !publicKey) {
      setIsLoading(false);
      return;
    }

    const fetchKeys = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ address: publicKey });
        const response = await fetch(`/api/merchant/api-keys?${params}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch API keys');
        }

        const data = await response.json();
        setKeys(data.keys || []);
      } catch (err) {
        console.error('Error fetching API keys:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeys();
  }, [isConnected, publicKey, refetchTrigger]);

  // Create new API key
  const handleCreateKey = async () => {
    if (!publicKey) return;

    setIsCreating(true);
    try {
      const { message } = generateApiKeyMessage(publicKey);

      const response = await fetch('/api/merchant/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: publicKey,
          message,
          signature: 'pending-sep0010', // TODO: Implement SEP-0010
          name: newKeyName || 'Default',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create API key');
      }

      const data = await response.json();
      setNewlyCreatedKey(data.api_key);
      setNewKeyName('');
      refetchKeys();

      toast({
        title: 'API Key Created',
        description: 'Make sure to copy your API key now. You won\'t be able to see it again!',
      });
    } catch (err) {
      console.error('Error creating API key:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Revoke API key
  const handleRevokeKey = async (keyId: string) => {
    if (!publicKey) return;

    setDeletingKeyId(keyId);
    try {
      const response = await fetch(`/api/merchant/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: publicKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke API key');
      }

      refetchKeys();
      toast({
        title: 'API Key Revoked',
        description: 'The API key has been revoked and can no longer be used.',
      });
    } catch (err) {
      console.error('Error revoking API key:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to revoke API key',
        variant: 'destructive',
      });
    } finally {
      setDeletingKeyId(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <BackButton href="/merchant" />
        <Card className="mt-8 max-w-md mx-auto">
          <CardContent className="py-8 text-center">
            <Key className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
            <p className="text-gray-600">Connect your wallet to manage API keys.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href="/merchant" />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-gray-600 mt-1">
            Manage API keys for integrating LumenLater checkout into your application.
          </p>
        </div>

        {/* New Key Created Alert */}
        {newlyCreatedKey && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                Save Your API Key
              </CardTitle>
              <CardDescription className="text-yellow-700">
                This is the only time you&apos;ll see your API key. Copy it now and store it securely.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-white rounded-lg p-3 border">
                <code className="flex-1 font-mono text-sm break-all">
                  {showKey ? newlyCreatedKey : '••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newlyCreatedKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setNewlyCreatedKey(null)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                I&apos;ve saved my key
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create New Key */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>
              Generate a new API key for your integration. Keys expire after 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="keyName" className="sr-only">
                  Key Name
                </Label>
                <Input
                  id="keyName"
                  placeholder="Key name (e.g., Production, Development)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <Button onClick={handleCreateKey} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Key
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : keys.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No API keys yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      key.is_revoked || key.is_expired
                        ? 'bg-gray-50 opacity-60'
                        : 'bg-white'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{key.name}</span>
                        {key.is_revoked && (
                          <Badge variant="destructive">Revoked</Badge>
                        )}
                        {key.is_expired && !key.is_revoked && (
                          <Badge variant="secondary">Expired</Badge>
                        )}
                        {!key.is_revoked && !key.is_expired && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 font-mono">
                        {key.prefix}•••{key.suffix}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && (
                          <> • Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                        )}
                        {' '}• Expires {new Date(key.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    {!key.is_revoked && !key.is_expired && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRevokeKey(key.id)}
                        disabled={deletingKeyId === key.id}
                      >
                        {deletingKeyId === key.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integration Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Integration Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Create a Checkout Session</h4>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`POST https://lumenlater.com/api/checkout/sessions
Authorization: Bearer ll_live_your_api_key

{
  "amount": 10000000,  // Amount in stroops (7 decimals)
  "order_id": "order_123",
  "description": "Product purchase",
  "success_url": "https://your-site.com/success?session_id={SESSION_ID}",
  "cancel_url": "https://your-site.com/cancel"
}`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Redirect to Checkout</h4>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Redirect user to the checkout_url from the response
window.location.href = response.checkout_url;`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Handle Webhook (Optional)</h4>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`// Webhook payload on successful payment
{
  "type": "checkout.session.completed",
  "data": {
    "session_id": "cs_xxx",
    "bill_id": "123",
    "amount": 10000000,
    "order_id": "order_123"
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  Plus, 
  Trash2, 
  Save, 
  X,
  Link as LinkIcon,
  Globe,
  Shield,
  Activity,
  Copy,
  CheckCircle,
  HelpCircle,
  Terminal
} from 'lucide-react';

const IntegrationPage = () => {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery(
    'webhooks',
    () => axios.get('/api/webhooks').then(res => res.data)
  );

  const webhooks = data?.data || [];

  const createWebhookMutation = useMutation(
    (webhookData) => axios.post('/api/webhooks', webhookData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('webhooks');
        toast.success('Webhook created successfully');
        setShowCreateForm(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create webhook');
      }
    }
  );

  const deleteWebhookMutation = useMutation(
    (id) => axios.delete(`/api/webhooks/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('webhooks');
        toast.success('Webhook deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete webhook');
      }
    }
  );

  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      events: ['ticket.created']
    }
  });

  const onSubmit = (data) => {
    createWebhookMutation.mutate(data);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      deleteWebhookMutation.mutate(id);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const incomingWebhookUrl = `${window.location.origin}/api/webhooks/incoming`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
            <p className="mt-2 text-gray-600">
              Manage incoming and outgoing webhooks to connect with external services
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Outgoing Webhooks List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <Activity className="h-5 w-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Outgoing Webhooks</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {webhooks.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No webhooks</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new outgoing webhook.</p>
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <div key={webhook._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-primary-600 truncate">{webhook.name}</p>
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${webhook.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-500 truncate">{webhook.url}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {webhook.events.map(event => (
                            <span key={event} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                        <button
                          onClick={() => handleDelete(webhook._id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-gray-400">
                        <Shield className="h-3 w-3 mr-1" />
                        Secret: <span className="ml-1 font-mono">{webhook.secret.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Incoming Webhook Info */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center">
              <Globe className="h-5 w-5 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Incoming Webhook</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Use this URL to send information to the Ticketing System from external applications.
              </p>
              
              <div className="bg-gray-50 rounded-md p-3 border border-gray-200 relative group">
                <div className="text-xs font-mono text-gray-800 break-all pr-8">
                  {incomingWebhookUrl}
                </div>
                <button 
                  onClick={() => copyToClipboard(incomingWebhookUrl)}
                  className="absolute right-2 top-2 p-1 text-gray-400 hover:text-primary-600 bg-white rounded shadow-sm border border-gray-100"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Terminal className="h-4 w-4 mr-1 text-gray-500" />
                  Example Usage
                </h3>
                <div className="mt-2 bg-gray-900 rounded-md p-3">
                  <pre className="text-[10px] text-gray-300 overflow-x-auto">
{`curl -X POST ${incomingWebhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "subject": "System Alert",
    "description": "High CPU usage",
    "customerEmail": "bot@example.com"
  }'`}
                  </pre>
                </div>
              </div>

              <div className="mt-4 flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded">
                <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Note:</p>
                  <p>If the customer email doesn't exist, a new user will be automatically created.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Webhook Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configure New Webhook</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discord Notifications"
                  {...register('name', { required: 'Name is required' })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  {...register('url', { 
                    required: 'URL is required',
                    pattern: {
                      value: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
                      message: 'Please enter a valid URL'
                    }
                  })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events to Subscribe
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto p-2 border border-gray-100 rounded">
                  {['ticket.created', 'ticket.updated', 'ticket.deleted', 'message.added'].map(event => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        value={event}
                        {...register('events', { required: 'Select at least one event' })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{event}</span>
                    </label>
                  ))}
                </div>
                {errors.events && (
                  <p className="mt-1 text-sm text-red-600">{errors.events.message}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWebhookMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                >
                  {createWebhookMutation.isLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationPage;

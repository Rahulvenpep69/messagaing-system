import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import axios from '../../api';

import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';
import { ArrowLeft, Send } from 'lucide-react';

const CreateTicket = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      priority: 'medium',
      category: 'general'
    }
  });

  const createTicketMutation = useMutation(
    (ticketData) => axios.post('/api/tickets', ticketData),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('tickets');
        queryClient.invalidateQueries('ticketStats');
        toast.success('Ticket created successfully!');
        navigate(`/tickets/${response.data.data._id}`);
      },
      onError: (error) => {
        const base = error.response?.data?.message || 'Failed to create ticket';
        const details = error.response?.data?.details;
        const message = details ? `${base}: ${details}` : base;
        toast.error(message);
      }
    }
  );

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Normalize tags: convert string (even empty) to array, drop if empty
      if (typeof data.tags === 'string') {
        const normalizedTags = data.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag);
        if (normalizedTags.length > 0) {
          data.tags = normalizedTags;
        } else {
          delete data.tags;
        }
      }
      try {
        await createTicketMutation.mutateAsync(data);
      } catch (e) {
        // Error surfaced via onError toast; prevent unhandled rejection overlay
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const description = watch('description', '');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Ticket</h1>
        <p className="mt-2 text-gray-600">
          Describe your issue and we'll help you resolve it as quickly as possible.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                {...register('priority', { required: 'Priority is required' })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                {...register('category', { required: 'Category is required' })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="complaint">Complaint</option>
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('subject', { 
                required: 'Subject is required',
                minLength: {
                  value: 5,
                  message: 'Subject must be at least 5 characters long'
                },
                maxLength: {
                  value: 200,
                  message: 'Subject cannot exceed 200 characters'
                }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Briefly describe your issue..."
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description', { 
                required: 'Description is required',
                minLength: {
                  value: 10,
                  message: 'Description must be at least 10 characters long'
                },
                maxLength: {
                  value: 2000,
                  message: 'Description cannot exceed 2000 characters'
                }
              })}
              rows={8}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Please provide detailed information about your issue. Include any error messages, steps to reproduce the problem, and any other relevant details..."
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Provide as much detail as possible to help us resolve your issue quickly.
                </p>
              )}
              <p className="text-sm text-gray-500">
                {description.length}/2000
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (Optional)
            </label>
            <input
              type="text"
              {...register('tags')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Add tags separated by commas (e.g., login, password, mobile app)"
            />
            <p className="mt-1 text-sm text-gray-500">
              Add relevant tags to help categorize your ticket.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Before submitting:</h3>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Check if your issue can be resolved using our documentation or FAQ</li>
              <li>Provide clear steps to reproduce the problem</li>
              <li>Include any error messages or screenshots if applicable</li>
              <li>Specify your operating system and browser version for technical issues</li>
            </ul>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createTicketMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || createTicketMutation.isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;

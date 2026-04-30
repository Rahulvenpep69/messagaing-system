import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  ArrowLeft, 
  Send, 
  Edit3, 
  Save, 
  X,
  Clock,
  CheckCircle,
  XCircle,
  Ticket as TicketIcon,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  MessageSquare,
  EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);

  const { data: ticket, isLoading, error } = useQuery(
    ['ticket', id],
    () => axios.get(`/api/tickets/${id}`).then(res => res.data.data),
    { enabled: !!id }
  );

  const { data: agents } = useQuery(
    'agents',
    () => axios.get('/api/users/agents').then(res => res.data.data),
    { enabled: user?.role === 'super_admin' }
  );

  const updateTicketMutation = useMutation(
    (updateData) => axios.put(`/api/tickets/${id}`, updateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ticket', id]);
        queryClient.invalidateQueries('tickets');
        toast.success('Ticket updated successfully');
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update ticket');
      }
    }
  );

  const addMessageMutation = useMutation(
    (messageData) => axios.post(`/api/tickets/${id}/messages`, messageData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ticket', id]);
        toast.success('Message added successfully');
        reset({ message: '', isInternal: false });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add message');
      }
    }
  );

  const assignTicketMutation = useMutation(
    (agentId) => axios.post(`/api/tickets/${id}/assign`, { agentId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ticket', id]);
        toast.success('Ticket assigned successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to assign ticket');
      }
    }
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, setValue, formState: { errors: editErrors } } = useForm();

  // Set form values when ticket loads
  React.useEffect(() => {
    if (ticket) {
      setValue('subject', ticket.subject);
      setValue('status', ticket.status);
      setValue('priority', ticket.priority);
      setValue('category', ticket.category);
      setValue('assignedAgent', ticket.assignedAgent?._id || '');
    }
  }, [ticket, setValue]);

  const onSubmitMessage = (data) => {
    addMessageMutation.mutate(data);
  };

  const onSubmitEdit = (data) => {
    // Convert tags string to array if provided
    if (data.tags && typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    updateTicketMutation.mutate(data);
  };

  const handleAssignAgent = (agentId) => {
    assignTicketMutation.mutate(agentId);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <TicketIcon className="h-5 w-5 text-blue-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'closed':
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <TicketIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = () => {
    if (user?.role === 'super_admin') return true;
    if (user?.role === 'agent' && ticket?.assignedAgent?._id === user.id) return true;
    if (user?.role === 'end_user' && ticket?.customer?._id === user.id && ticket?.status === 'open') return true;
    return false;
  };

  const canAssign = () => {
    return user?.role === 'super_admin';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Ticket not found</h2>
          <p className="mt-2 text-sm text-gray-500">
            The ticket you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={() => navigate('/tickets')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const visibleMessages = showInternalNotes ? ticket.messages : ticket.messages.filter(msg => !msg.isInternal);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tickets
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(ticket.status)}
            <h1 className="text-3xl font-bold text-gray-900">{ticket.ticketNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority}
            </span>
          </div>
          
          {canEdit() && (
            <div className="flex items-center space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <div className="bg-white shadow rounded-lg p-6">
            {isEditing ? (
              <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    {...registerEdit('subject', { required: 'Subject is required' })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  {editErrors.subject && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.subject.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      {...registerEdit('status')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      {user?.role === 'super_admin' && <option value="closed">Closed</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      {...registerEdit('priority')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      {...registerEdit('category')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    >
                      <option value="general">General</option>
                      <option value="technical">Technical</option>
                      <option value="billing">Billing</option>
                      <option value="complaint">Complaint</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateTicketMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {updateTicketMutation.isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{ticket.subject}</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Conversation</h3>
                {(user?.role === 'super_admin' || user?.role === 'agent') && (
                  <button
                    onClick={() => setShowInternalNotes(!showInternalNotes)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      showInternalNotes 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    {showInternalNotes ? 'Hide' : 'Show'} Internal Notes
                  </button>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {visibleMessages.map((message, index) => (
                <div key={index} className={`p-6 ${message.isInternal ? 'bg-yellow-50' : ''}`}>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {message.sender?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {message.sender?.name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {message.sender?.role === 'super_admin' ? 'Admin' : 
                           message.sender?.role === 'agent' ? 'Agent' : 'Customer'}
                        </span>
                        {message.isInternal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Internal Note
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Message Form */}
            <div className="px-6 py-4 border-t border-gray-200">
              <form onSubmit={handleSubmit(onSubmitMessage)} className="space-y-4">
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a message
                  </label>
                  <textarea
                    {...register('message', { required: 'Message is required' })}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Type your message here..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {(user?.role === 'super_admin' || user?.role === 'agent') && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        {...register('isInternal')}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Internal note (not visible to customer)</span>
                    </label>
                  )}
                  
                  <button
                    type="submit"
                    disabled={addMessageMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {addMessageMutation.isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer</dt>
                <dd className="mt-1 flex items-center text-sm text-gray-900">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {ticket.customer?.name}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Assigned Agent</dt>
                <dd className="mt-1 flex items-center text-sm text-gray-900">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  {ticket.assignedAgent?.name || 'Unassigned'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 flex items-center text-sm text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 flex items-center text-sm text-gray-900">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="mt-1 flex items-center text-sm text-gray-900">
                  <MessageSquare className="h-4 w-4 mr-2 text-gray-400" />
                  {ticket.source === 'web' ? 'Web Portal' : 
                   ticket.source === 'email' ? 'Email' : 
                   ticket.source}
                </dd>
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {ticket.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Assignment (Super Admin only) */}
          {canAssign() && agents && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment</h3>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent._id}
                    onClick={() => handleAssignAgent(agent._id)}
                    disabled={assignTicketMutation.isLoading}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      ticket.assignedAgent?._id === agent._id
                        ? 'bg-primary-100 text-primary-800'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {agent.name}
                    {ticket.assignedAgent?._id === agent._id && (
                      <span className="ml-2 text-xs font-medium">(Current)</span>
                    )}
                  </button>
                ))}
                {ticket.assignedAgent && (
                  <button
                    onClick={() => handleAssignAgent(null)}
                    disabled={assignTicketMutation.isLoading}
                    className="w-full text-left px-3 py-2 rounded-md text-sm text-red-700 hover:bg-red-50"
                  >
                    Unassign
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;

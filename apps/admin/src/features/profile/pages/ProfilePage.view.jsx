import { Mail, Phone, MapPin, Shield, Camera, CheckCircle, Clock, Monitor } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { formatDate, formatDateTime } from '../../../services/adminShared';

export function ProfileView({ model }) {
  const {
    isEditing,
    setIsEditing,
    fileInputRef,
    profile,
    setProfile,
    passwordModal,
    setPasswordModal,
    newPassword,
    setNewPassword,
    handleSave,
    handleAvatar,
    handlePassword,
    currentEvent,
    currentAgent,
    describeUserAgent,
    deviceLabel,
  } = model;
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">
          Manage your personal information and security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="relative inline-block mb-4">
              {profile.avatarUri ? (
                <img
                  src={profile.avatarUri}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover mx-auto border-4 border-white shadow-sm"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto border-4 border-white shadow-sm">
                  {profile.firstName.charAt(0)}
                  {profile.lastName.charAt(0)}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleAvatar}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full border border-gray-200 shadow-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Camera size={16} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-blue-600 font-medium text-sm mt-1">{profile.role}</p>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3 text-sm text-left">
              <div className="flex items-center text-gray-600">
                <Mail size={16} className="mr-3 text-gray-400" /> {profile.email}
              </div>
              <div className="flex items-center text-gray-600">
                <Phone size={16} className="mr-3 text-gray-400" /> {profile.phone}
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin size={16} className="mr-3 text-gray-400" /> {profile.location}
              </div>
              <div className="flex items-center text-gray-600">
                <Clock size={16} className="mr-3 text-gray-400" /> Joined{' '}
                {formatDate(profile.joined)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Shield size={18} className="mr-2 text-blue-500" /> Security
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Password</p>
                <p className="text-xs text-gray-500 mb-2">
                  {profile.passwordChangedAt
                    ? `Last changed ${formatDate(profile.passwordChangedAt)}`
                    : 'Change history not recorded'}
                </p>
                <button
                  onClick={() => {
                    setNewPassword('');
                    setPasswordModal(true);
                  }}
                  className="w-full text-sm bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Change Password
                </button>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                <p
                  className={`text-xs font-medium mb-2 flex items-center mt-1 ${profile.mfaFactors.length ? 'text-green-600' : 'text-gray-500'}`}
                >
                  <CheckCircle size={12} className="mr-1" />{' '}
                  {profile.mfaFactors.length
                    ? `${profile.mfaFactors.length} verified factor${profile.mfaFactors.length === 1 ? '' : 's'}`
                    : 'No verified factors'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <textarea
                        rows={4}
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 resize-none"
                      ></textarea>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-sm font-medium text-gray-500">First Name</p>
                      <p className="mt-1 text-base text-gray-900">{profile.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Name</p>
                      <p className="mt-1 text-base text-gray-900">{profile.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="mt-1 text-base text-gray-900">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone Number</p>
                      <p className="mt-1 text-base text-gray-900">{profile.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="mt-1 text-base text-gray-900">{profile.location}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">Bio</p>
                      <p className="mt-1 text-base text-gray-900 leading-relaxed">{profile.bio}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Active Sessions</h2>
              <p className="text-sm text-gray-500 mt-1">
                Devices currently logged into your account
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mr-4">
                    <Monitor size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {deviceLabel(currentAgent) || 'Current authenticated session'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentEvent?.ip_address || 'IP not recorded'}
                      {profile.session?.created_at
                        ? ` • Started ${formatDateTime(profile.session.created_at)}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Current Session
                </span>
              </div>
            </div>
          </div>

          {/* Login History */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Login History</h2>
                <p className="text-sm text-gray-500 mt-1">Recent authentication activity</p>
              </div>
              <span className="text-sm text-gray-500">
                {profile.authenticationEvents.length} recorded
              </span>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Date & Time
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Location & IP
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Device
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {profile.authenticationEvents.map((event) => {
                  return (
                    <tr key={event.id}>
                      <td className="px-6 py-3 whitespace-nowrap text-gray-900 font-medium">
                        {formatDateTime(event.created_at)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                        {event.ip_address || ''}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                        {deviceLabel(describeUserAgent(event.user_agent))}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <span className="text-green-600 font-medium text-xs bg-green-50 px-2 py-0.5 rounded">
                          {event.event_type.replaceAll('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!profile.authenticationEvents.length && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No authentication events have been recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Modal isOpen={passwordModal} onClose={() => setPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <p className="text-gray-600">Enter a new password with at least 8 characters:</p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border p-2"
            placeholder="New password"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setPasswordModal(false)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePassword()}
              disabled={newPassword.length < 8}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Update Password
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

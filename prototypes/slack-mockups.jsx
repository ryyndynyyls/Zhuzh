/**
 * ResourceFlow - Slack UI Mockups (v2)
 * 
 * Updated based on team feedback from Workshop prep:
 * - Added "Flag an Issue" button (Maleno's proactive flagging)
 * - Added Monday scheduling notification view
 * - Added rubber-stamp warning in Manager View (Michelle's insight)
 * - Added quick tags for surprise work (Kara's feedback)
 * - Added View by Phase to Budget Query (Michelle's request)
 * 
 * Views included:
 * 1. Monday DM - "Your week has been scheduled" notification
 * 2. Friday DM - The weekly "confirm your week" notification
 * 3. Confirm Modal - Where employees adjust hours
 * 4. Add Work - For unplanned tasks (with quick tags)
 * 5. Manager View - Approval with anomaly + rubber-stamp detection
 * 6. Budget Query - Quick /budget command with phase breakdown
 * 
 * Workshop Team Domains:
 * - Kara owns Employee Experience (Monday DM, Friday DM, Confirm Modal, Add Work)
 * - Michelle owns Approvals & Reporting (Manager View, Budget Query)
 * - Maleno owns Resource Planning (web app, not shown here)
 * 
 * Design Principles (from team feedback):
 * - Trust = Accuracy + Adoption + Auditability (Levi)
 * - One page, no hunting (Maleno)
 * - Proactive, not reactive (Maleno)
 * - Meet people where they are — DMs, not channels (Kara)
 */

import React, { useState } from 'react';

const SlackMockups = () => {
  const [activeView, setActiveView] = useState('monday');
  const [hours, setHours] = useState({
    'google-cloud': '24',
    'patina': '12',
    'internal': '4'
  });

  const plannedHours = { 'google-cloud': 24, 'patina': 12, 'internal': 4 };
  const totalPlanned = 40;
  const totalActual = Object.values(hours).reduce((a, b) => a + (parseInt(b) || 0), 0);
  const variance = totalActual - totalPlanned;

  const views = [
    { id: 'monday', label: 'Monday DM' },
    { id: 'friday', label: 'Friday DM' },
    { id: 'confirm', label: 'Confirm Modal' },
    { id: 'add-work', label: 'Add Work' },
    { id: 'approval', label: 'Manager View' },
    { id: 'approval-rubberstamp', label: 'Rubber-Stamp Alert' },
    { id: 'budget', label: 'Budget Query' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* View Selector */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === view.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-3">
          Click to preview different Slack interactions
        </p>
      </div>

      {/* Slack Message Container */}
      <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Slack Header */}
        <div className="bg-gray-850 px-4 py-3 border-b border-gray-700 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-lg">⏱</span>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">ResourceFlow</div>
            <div className="text-gray-400 text-xs">
              App • {activeView === 'monday' ? 'Monday 9:00 AM' : activeView === 'friday' ? 'Friday 3:00 PM' : 'Just now'}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4">
          
          {/* Monday Scheduling Notification (NEW) */}
          {activeView === 'monday' && (
            <div className="space-y-4">
              <div className="text-gray-100">
                <span className="text-xl mr-2">📅</span>
                <strong>Your week has been scheduled!</strong>
              </div>
              <div className="text-gray-300 text-sm">
                Here's your plan for <strong>Dec 16–20</strong>:
              </div>
              
              <div className="bg-gray-750 rounded-lg overflow-hidden border border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left text-gray-300 font-medium px-4 py-2">Project</th>
                      <th className="text-right text-gray-300 font-medium px-4 py-2">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    <tr>
                      <td className="px-4 py-2 text-gray-200">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                        Google Cloud UX
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right">24 hrs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        Patina
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right">12 hrs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                        Internal/Admin
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right">4 hrs</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-gray-200 font-medium">Total</td>
                      <td className="px-4 py-2 text-gray-200 text-right font-medium">40 hrs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-2">
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  ✓ Looks Good
                </button>
                <button 
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  View Details
                </button>
                <button 
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  ⚠ Flag Issue
                </button>
              </div>
              
              <div className="text-gray-500 text-xs">
                Only visible to you • Finalized by your PM on Thursday
              </div>
            </div>
          )}

          {/* Friday Confirmation Notification */}
          {activeView === 'friday' && (
            <div className="space-y-4">
              <div className="text-gray-100">
                <span className="text-xl mr-2">📋</span>
                <strong>Time to confirm your week!</strong>
              </div>
              <div className="text-gray-300 text-sm">
                Here's what was planned for <strong>Dec 16–20</strong>:
              </div>
              
              <div className="bg-gray-750 rounded-lg overflow-hidden border border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left text-gray-300 font-medium px-4 py-2">Project</th>
                      <th className="text-right text-gray-300 font-medium px-4 py-2">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    <tr>
                      <td className="px-4 py-2 text-gray-200">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                        Google Cloud UX
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right">24 hrs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        Patina
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right">12 hrs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                        Internal/Admin
                      </td>
                      <td className="px-4 py-2 text-gray-300 text-right">4 hrs</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-gray-200 font-medium">Total</td>
                      <td className="px-4 py-2 text-gray-200 text-right font-medium">40 hrs</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-2">
                <button 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  ✓ Looks Good
                </button>
                <button 
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  ✎ Adjust Hours
                </button>
              </div>
              
              <div className="text-gray-500 text-xs">
                Only visible to you • Due by EOD Friday
              </div>
            </div>
          )}

          {/* Confirm Modal */}
          {activeView === 'confirm' && (
            <div className="space-y-4">
              <div className="text-gray-100 text-lg font-semibold">
                Confirm Your Week
              </div>
              <div className="text-gray-400 text-sm">
                Dec 16–20 • Adjust hours if needed
              </div>
              
              <div className="space-y-3">
                {/* Google Cloud */}
                <div className="bg-gray-750 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-200 font-medium">Google Cloud UX</span>
                    </div>
                    <span className="text-gray-500 text-sm">Planned: 24 hrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hours['google-cloud']}
                      onChange={(e) => setHours({...hours, 'google-cloud': e.target.value})}
                      className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-center"
                    />
                    <span className="text-gray-400">hrs actual</span>
                    {hours['google-cloud'] !== '24' && (
                      <span className={`text-sm ${parseInt(hours['google-cloud']) > 24 ? 'text-red-400' : 'text-yellow-400'}`}>
                        ({parseInt(hours['google-cloud']) > 24 ? '+' : ''}{parseInt(hours['google-cloud']) - 24})
                      </span>
                    )}
                  </div>
                </div>

                {/* Patina */}
                <div className="bg-gray-750 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-gray-200 font-medium">Patina</span>
                    </div>
                    <span className="text-gray-500 text-sm">Planned: 12 hrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hours['patina']}
                      onChange={(e) => setHours({...hours, 'patina': e.target.value})}
                      className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-center"
                    />
                    <span className="text-gray-400">hrs actual</span>
                    {hours['patina'] !== '12' && (
                      <span className={`text-sm ${parseInt(hours['patina']) > 12 ? 'text-red-400' : 'text-yellow-400'}`}>
                        ({parseInt(hours['patina']) > 12 ? '+' : ''}{parseInt(hours['patina']) - 12})
                      </span>
                    )}
                  </div>
                </div>

                {/* Internal */}
                <div className="bg-gray-750 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <span className="text-gray-200 font-medium">Internal/Admin</span>
                    </div>
                    <span className="text-gray-500 text-sm">Planned: 4 hrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hours['internal']}
                      onChange={(e) => setHours({...hours, 'internal': e.target.value})}
                      className="w-20 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-center"
                    />
                    <span className="text-gray-400">hrs actual</span>
                  </div>
                </div>
              </div>

              {/* Add Work Button (Links to add-work view) */}
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded transition-colors border border-dashed border-gray-500">
                + Add Unplanned Work
              </button>

              {/* Summary */}
              <div className="bg-gray-750 rounded-lg p-3 border border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Actual</span>
                  <span className="text-white font-semibold text-lg">{totalActual} hrs</span>
                </div>
                {variance !== 0 && (
                  <div className={`text-sm mt-1 ${variance > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {variance > 0 ? `+${variance} hrs over plan` : `${Math.abs(variance)} hrs under plan`}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Notes (optional)</label>
                <textarea 
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 resize-none"
                  rows="2"
                  placeholder="Any context for the changes..."
                />
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors">
                  Cancel
                </button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors">
                  Submit for Approval
                </button>
              </div>
            </div>
          )}

          {/* Add Work Modal (Updated with quick tags - Kara's feedback) */}
          {activeView === 'add-work' && (
            <div className="space-y-4">
              <div className="text-gray-100 text-lg font-semibold">
                Add Unplanned Work
              </div>
              <div className="text-gray-400 text-sm">
                Log work that wasn't in your original plan
              </div>

              {/* Quick tags (NEW - from Kara's feedback about surprise work) */}
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Quick tags (optional)</label>
                <div className="flex flex-wrap gap-2">
                  <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-sm transition-colors">
                    🔥 Urgent fix
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-sm transition-colors">
                    📞 Client call
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-sm transition-colors">
                    🔧 Tech debt
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-sm transition-colors">
                    🆘 Scope creep
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-sm transition-colors">
                    ❓ Other
                  </button>
                </div>
              </div>
              
              {/* Project Selection */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Project</label>
                <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                  <option>Select a project...</option>
                  <option>Google Cloud UX</option>
                  <option>Patina</option>
                  <option>Internal/Admin</option>
                  <option className="text-gray-400">+ New project (needs PM approval)</option>
                </select>
              </div>

              {/* Hours */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">Hours</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>

              {/* What did you work on? */}
              <div>
                <label className="text-gray-400 text-sm mb-1 block">What did you work on?</label>
                <textarea 
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 resize-none"
                  rows="3"
                  placeholder="Brief description of the work..."
                />
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors">
                  Cancel
                </button>
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
                  Add to Timesheet
                </button>
              </div>
            </div>
          )}

          {/* Manager Approval View */}
          {activeView === 'approval' && (
            <div className="space-y-4">
              <div className="text-gray-100">
                <span className="text-xl mr-2">📋</span>
                <strong>Timesheet submitted for approval</strong>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                  SK
                </div>
                <div>
                  <div className="text-white font-medium">Sarah Kim</div>
                  <div className="text-gray-400 text-sm">Week of Dec 16–20</div>
                </div>
              </div>

              <div className="bg-gray-750 rounded-lg overflow-hidden border border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left text-gray-300 font-medium px-4 py-2">Project</th>
                      <th className="text-right text-gray-300 font-medium px-4 py-2">Plan</th>
                      <th className="text-right text-gray-300 font-medium px-4 py-2">Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    <tr>
                      <td className="px-4 py-2 text-gray-200">Google Cloud UX</td>
                      <td className="px-4 py-2 text-gray-400 text-right">24</td>
                      <td className="px-4 py-2 text-red-400 text-right font-medium">32 ↑</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">Patina</td>
                      <td className="px-4 py-2 text-gray-400 text-right">12</td>
                      <td className="px-4 py-2 text-yellow-400 text-right">8 ↓</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">Internal/Admin</td>
                      <td className="px-4 py-2 text-gray-400 text-right">4</td>
                      <td className="px-4 py-2 text-gray-300 text-right">4</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-gray-200 font-medium">Total</td>
                      <td className="px-4 py-2 text-gray-400 text-right">40</td>
                      <td className="px-4 py-2 text-yellow-400 text-right font-medium">44</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-yellow-500">⚠️</span>
                <span className="text-yellow-200 text-sm">
                  4 hrs overtime • Google Cloud +8 hrs over plan
                </span>
              </div>

              <div className="bg-gray-750 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Sarah's notes</div>
                <div className="text-gray-200 text-sm">
                  "Client requested urgent changes to the dashboard before their board meeting. Had to shift some Patina time."
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors">
                  ✓ Approve
                </button>
                <button className="flex-1 bg-red-600/80 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors">
                  ✗ Reject
                </button>
              </div>
              <button className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
                View in App →
              </button>
            </div>
          )}

          {/* Manager Approval View - Rubber-stamp Alert (NEW - Michelle's insight) */}
          {activeView === 'approval-rubberstamp' && (
            <div className="space-y-4">
              <div className="text-gray-100">
                <span className="text-xl mr-2">📋</span>
                <strong>Timesheet submitted for approval</strong>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                  JD
                </div>
                <div>
                  <div className="text-white font-medium">Jake Davis</div>
                  <div className="text-gray-400 text-sm">Week of Dec 16–20</div>
                </div>
              </div>

              <div className="bg-gray-750 rounded-lg overflow-hidden border border-gray-600">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left text-gray-300 font-medium px-4 py-2">Project</th>
                      <th className="text-right text-gray-300 font-medium px-4 py-2">Plan</th>
                      <th className="text-right text-gray-300 font-medium px-4 py-2">Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-600">
                    <tr>
                      <td className="px-4 py-2 text-gray-200">Patina</td>
                      <td className="px-4 py-2 text-gray-400 text-right">20</td>
                      <td className="px-4 py-2 text-gray-300 text-right">20</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">Google Retail</td>
                      <td className="px-4 py-2 text-gray-400 text-right">16</td>
                      <td className="px-4 py-2 text-gray-300 text-right">16</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-gray-200">Internal/Admin</td>
                      <td className="px-4 py-2 text-gray-400 text-right">4</td>
                      <td className="px-4 py-2 text-gray-300 text-right">4</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td className="px-4 py-2 text-gray-200 font-medium">Total</td>
                      <td className="px-4 py-2 text-gray-400 text-right">40</td>
                      <td className="px-4 py-2 text-gray-300 text-right font-medium">40</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Rubber-stamp warning (Michelle's insight) */}
              <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-orange-500">🔍</span>
                <span className="text-orange-200 text-sm">
                  <strong>Review suggested:</strong> Actual = Planned exactly (possible rubber-stamp)
                </span>
              </div>

              <div className="bg-gray-750 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">No notes provided</div>
                <div className="text-gray-500 text-sm italic">Jake submitted without adding context</div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors">
                  ✓ Approve Anyway
                </button>
                <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded transition-colors">
                  💬 Ask for Details
                </button>
              </div>
              <button className="w-full bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
                View in App →
              </button>
            </div>
          )}

          {/* Budget Query (Updated with View by Phase - Michelle's request) */}
          {activeView === 'budget' && (
            <div className="space-y-4">
              <div className="bg-gray-750 rounded px-3 py-2 text-gray-400 text-sm font-mono">
                /budget google cloud
              </div>

              <div className="text-gray-100">
                <span className="text-xl mr-2">📊</span>
                <strong>Google Cloud UX</strong>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Budget</span>
                  <span className="text-gray-200">400 hrs • $70,000</span>
                </div>
                
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                    style={{ width: '68%' }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-purple-400 font-medium">68% burned</span>
                  <span className="text-gray-400">272 of 400 hrs</span>
                </div>
              </div>

              <div className="bg-gray-750 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-gray-200">128 hrs • $22,400</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current burn rate</span>
                  <span className="text-gray-200">~45 hrs/week</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Est. runway</span>
                  <span className="text-green-400 font-medium">~3 weeks</span>
                </div>
              </div>

              {/* Updated button layout with View by Phase (Michelle's request) */}
              <div className="flex gap-2">
                <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
                  By Phase
                </button>
                <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
                  By Person
                </button>
                <button className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
                  Full Report →
                </button>
              </div>

              <div className="text-gray-500 text-xs">
                Last updated: Today at 2:34 PM
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Implementation Notes */}
      <div className="max-w-2xl mx-auto mt-6 text-center">
        <p className="text-gray-500 text-sm">
          These mockups use Slack Block Kit patterns • 
          <span className="text-purple-400"> Updated with team feedback from Workshop prep</span>
        </p>
      </div>
    </div>
  );
};

export default SlackMockups;
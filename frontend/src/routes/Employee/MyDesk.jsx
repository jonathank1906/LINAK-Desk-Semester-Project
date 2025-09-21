
export default function MyDesk() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

      {/* Current Desk Status Header */}
      <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Desk #23 - Conference Area</h2>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600 font-medium">Connected</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">85cm</div>
            <div className="text-sm text-gray-500">Current Height</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">Idle</div>
            <div className="text-sm text-gray-500">Status</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">2h 45min</div>
            <div className="text-sm text-gray-500">Session Time</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column - Height Controls */}
        <div className="space-y-4">

          {/* Manual Height Control */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Height Control</h3>
            <div className="space-y-4">

              {/* Height Display with Visual */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Min: 60cm</span>
                  <span className="text-lg font-bold">85cm</span>
                  <span className="text-sm text-gray-600">Max: 120cm</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: '41.7%' }}
                  ></div>
                </div>
              </div>

              {/* Manual Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors">
                  ↑ Up
                </button>
                <button className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors">
                  ↓ Down
                </button>
              </div>

              {/* Emergency Stop */}
              <button className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors font-semibold">
                🛑 EMERGENCY STOP
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Quick Presets</h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                <div>
                  <div className="font-medium text-green-800">Sitting Position</div>
                  <div className="text-sm text-green-600">72cm</div>
                </div>
                <div className="text-green-600">Go →</div>
              </button>

              <button className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <div>
                  <div className="font-medium text-blue-800">Standing Position</div>
                  <div className="text-sm text-blue-600">110cm</div>
                </div>
                <div className="text-blue-600">Go →</div>
              </button>

              <button className="flex justify-between items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                <div>
                  <div className="font-medium text-purple-800">Meeting Height</div>
                  <div className="text-sm text-purple-600">95cm</div>
                </div>
                <div className="text-purple-600">Go →</div>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column - Settings & Info */}
        <div className="space-y-4">

          {/* Personal Presets Management */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">My Personal Presets</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm">+ Add New</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">My Sitting</div>
                  <div className="text-sm text-gray-600">74cm - Perfect for typing</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                  <button className="text-green-600 text-sm hover:text-green-700">Use</button>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">My Standing</div>
                  <div className="text-sm text-gray-600">108cm - Comfortable standing</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                  <button className="text-green-600 text-sm hover:text-green-700">Use</button>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Presentation Mode</div>
                  <div className="text-sm text-gray-600">98cm - Screen sharing height</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                  <button className="text-green-600 text-sm hover:text-green-700">Use</button>
                </div>
              </div>
            </div>
          </div>

          {/* Desk Information */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Desk Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Model:</span>
                <span className="font-medium">Linak DeskLine Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium">Conference Area, Floor 2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Maintenance:</span>
                <span className="font-medium">Sep 15, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Usage Today:</span>
                <span className="font-medium">6h 22min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Height Changes Today:</span>
                <span className="font-medium">12 times</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Today's Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">4h 15min</div>
                <div className="text-sm text-green-700">Sitting Time</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">2h 07min</div>
                <div className="text-sm text-blue-700">Standing Time</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-center">
              <div className="text-sm text-yellow-700">
                Recommendation: You've been sitting for 35 minutes. Consider standing for better health.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
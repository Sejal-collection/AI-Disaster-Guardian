import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, CheckCircle2, Circle, Activity, FileText, Loader2, ShieldAlert, ShieldCheck, Mic, MicOff, Radio } from 'lucide-react';
import { RecoveryTask, DisasterType, AgentStatus } from '../types';
import { generateRecoveryPlan, processVoiceCommand } from '../services/geminiService';

const RecoveryOps: React.FC = () => {
  const [tasks, setTasks] = useState<RecoveryTask[]>([]);
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [activeTaskIndex, setActiveTaskIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Simulation config
  const [simLocation, setSimLocation] = useState('Coastal District A');
  const [simType, setSimType] = useState<DisasterType>(DisasterType.FLOOD);

  // Voice Command State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Main execution loop
  useEffect(() => {
    let timer: any; // Explicitly 'any' to handle browser/node env diffs

    if (status === AgentStatus.EXECUTING && activeTaskIndex < tasks.length) {
      timer = setTimeout(() => {
        // Instead of auto-completing, we pause for approval
        setStatus(AgentStatus.AWAITING_APPROVAL);
        setLogs(prev => [...prev, `[SYSTEM] Task "${tasks[activeTaskIndex].title}" pending Commander approval.`]);
      }, 3000); // 3 seconds simulation time per task
    }

    return () => clearTimeout(timer);
  }, [status, activeTaskIndex, tasks]);

  const handleGeneratePlan = async () => {
    setStatus(AgentStatus.PLANNING);
    setLogs(prev => [...prev, `[AI] Analyzing impact for ${simType} in ${simLocation}...`]);
    setLogs(prev => [...prev, `[AI] Generating resource allocation strategy...`]);
    
    const plan = await generateRecoveryPlan(simType, simLocation);
    setTasks(plan);
    setLogs(prev => [...prev, `[AI] Plan generated with ${plan.length} operational phases.`]);
    setStatus(AgentStatus.IDLE);
    setActiveTaskIndex(-1);
  };

  const toggleExecution = () => {
    if (status === AgentStatus.IDLE || status === AgentStatus.PAUSED) {
      if (tasks.length === 0) return;
      
      // If starting fresh
      if (activeTaskIndex === -1) {
          setStatus(AgentStatus.EXECUTING);
          setActiveTaskIndex(0);
          const newTasks = [...tasks];
          newTasks[0].status = 'in-progress';
          setTasks(newTasks);
          setLogs(prev => [...prev, `[SYSTEM] Operation Commenced.`]);
          setLogs(prev => [...prev, `[STARTED] ${newTasks[0].title} - Agent: ${newTasks[0].assignedAgent}`]);
      } else {
          // Resuming
          setStatus(AgentStatus.EXECUTING);
          setLogs(prev => [...prev, `[SYSTEM] Operation Resumed.`]);
      }
    } else if (status === AgentStatus.EXECUTING) {
      setStatus(AgentStatus.PAUSED);
      setLogs(prev => [...prev, `[SYSTEM] Operation Paused by Commander.`]);
    }
  };

  const handleApproveTask = () => {
    if (activeTaskIndex === -1) return;

    const newTasks = [...tasks];
    
    // Complete current
    newTasks[activeTaskIndex].status = 'completed';
    setLogs(prev => [...prev, `[COMPLETED] ${newTasks[activeTaskIndex].title} confirmed by Commander.`]);

    // Prepare next
    const nextIndex = activeTaskIndex + 1;
    if (nextIndex < newTasks.length) {
        newTasks[nextIndex].status = 'in-progress';
        setTasks(newTasks);
        setActiveTaskIndex(nextIndex);
        setStatus(AgentStatus.EXECUTING);
        setLogs(prev => [...prev, `[STARTED] ${newTasks[nextIndex].title} - Agent: ${newTasks[nextIndex].assignedAgent}`]);
    } else {
        setTasks(newTasks);
        setStatus(AgentStatus.COMPLETED);
        setLogs(prev => [...prev, `[SYSTEM] All recovery operations completed successfully.`]);
    }
  };

  // Voice Command Handler
  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.lang = 'en-US'; // Default to English, but usually detects or accepts mixed input well enough for simple commands
    recognition.interimResults = false;

    recognition.onstart = () => {
        setIsListening(true);
        setLogs(prev => [...prev, `[COMMS] Listening for voice command...`]);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLogs(prev => [...prev, `[USER VOICE] "${transcript}"`]);
        
        setIsProcessingVoice(true);
        setLogs(prev => [...prev, `[AI] Analyzing intent...`]);
        
        const { updatedTasks, reply } = await processVoiceCommand(transcript, tasks);
        
        setTasks(updatedTasks);
        setLogs(prev => [...prev, `[AI REASONING] ${reply}`]);
        setIsProcessingVoice(false);
    };
    
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setLogs(prev => [...prev, `[COMMS] Voice signal lost. Error: ${event.error}`]);
    };

    recognition.start();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      {/* Commander Approval Modal */}
      {status === AgentStatus.AWAITING_APPROVAL && activeTaskIndex !== -1 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl animate-in fade-in duration-200 h-full">
           <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-6 max-w-md w-full shadow-2xl transform scale-100">
              <div className="flex items-center gap-3 mb-4 text-blue-400">
                <ShieldAlert className="w-8 h-8" />
                <h3 className="text-xl font-bold text-white">Commander Approval Required</h3>
              </div>
              <p className="text-slate-300 mb-2">
                Agent <span className="font-mono text-blue-300">{tasks[activeTaskIndex].assignedAgent}</span> reports task completion:
              </p>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 mb-6">
                <p className="font-bold text-white">{tasks[activeTaskIndex].title}</p>
                <p className="text-sm text-slate-400">{tasks[activeTaskIndex].description}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setStatus(AgentStatus.PAUSED)}
                  className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition-colors"
                >
                  Pause / Review
                </button>
                <button 
                  onClick={handleApproveTask}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Confirm & Proceed
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Left Column: Configuration & Status */}
      <div className="lg:col-span-1 space-y-6 flex flex-col">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Operation Control
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Location</label>
              <input 
                type="text" 
                value={simLocation}
                onChange={(e) => setSimLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-bold">Scenario Type</label>
              <select 
                value={simType}
                onChange={(e) => setSimType(e.target.value as DisasterType)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 mt-1"
              >
                {Object.values(DisasterType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleGeneratePlan}
                disabled={status !== AgentStatus.IDLE && status !== AgentStatus.COMPLETED}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
              >
                {status === AgentStatus.PLANNING ? 'Planning...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-200">Live Decision Logs</h3>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">REAL-TIME</span>
          </div>
          <div className="flex-grow overflow-y-auto font-mono text-xs space-y-2 pr-2 custom-scrollbar">
            {logs.length === 0 && <span className="text-slate-600 italic">No activity recorded.</span>}
            {logs.map((log, i) => (
              <div key={i} className="border-l-2 border-slate-700 pl-2 py-1">
                <span className="text-slate-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                <span className={log.includes('[AI]') ? 'text-purple-400' : log.includes('[SYSTEM]') ? 'text-amber-400' : 'text-slate-300'}>
                    {log.replace(/\[.*?\] /, '')}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Right Column: Task List & Execution */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-[600px]">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Recovery Operations Agent</h2>
            <p className="text-slate-400 text-sm">Autonomous resource coordination and task execution</p>
          </div>
          <div className="flex items-center gap-3">
             {/* Voice Command Button */}
             <button
               onClick={handleVoiceCommand}
               disabled={isListening || isProcessingVoice}
               className={`flex items-center gap-2 px-4 py-2 rounded-full border font-bold transition-all ${
                  isListening 
                    ? 'bg-red-600 text-white border-red-500 animate-pulse' 
                    : isProcessingVoice
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
               }`}
               title="Push to Talk (Voice Command)"
             >
                {isListening ? <Mic className="w-4 h-4" /> : isProcessingVoice ? <Radio className="w-4 h-4 animate-spin" /> : <MicOff className="w-4 h-4" />}
                <span className="hidden md:inline text-xs">{isListening ? 'LISTENING...' : isProcessingVoice ? 'PROCESSING...' : 'VOICE COMMS'}</span>
             </button>

             <div className={`hidden md:block px-3 py-1 rounded-full text-xs font-bold border ${
                 status === AgentStatus.EXECUTING ? 'bg-emerald-950 text-emerald-400 border-emerald-900 animate-pulse' :
                 status === AgentStatus.AWAITING_APPROVAL ? 'bg-blue-950 text-blue-400 border-blue-900' :
                 status === AgentStatus.PAUSED ? 'bg-amber-950 text-amber-400 border-amber-900' :
                 'bg-slate-800 text-slate-400 border-slate-700'
             }`}>
                 STATUS: {status.replace('_', ' ')}
             </div>
             <button 
                onClick={toggleExecution}
                disabled={tasks.length === 0 || status === AgentStatus.COMPLETED || status === AgentStatus.AWAITING_APPROVAL}
                className={`p-3 rounded-full transition-all ${
                    status === AgentStatus.EXECUTING 
                    ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                } disabled:opacity-50 disabled:grayscale`}
             >
                {status === AgentStatus.EXECUTING ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
             </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {tasks.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <FileText className="w-12 h-12 mb-2 opacity-50" />
                    <p>No operational plan loaded.</p>
                </div>
            )}
            {tasks.map((task, idx) => (
                <div 
                    key={task.id} 
                    className={`relative p-4 rounded-lg border transition-all duration-300 ${
                        idx === activeTaskIndex 
                        ? 'bg-blue-900/20 border-blue-500/50 scale-[1.01] shadow-lg shadow-blue-900/20' 
                        : task.status === 'completed'
                        ? 'bg-slate-900/50 border-emerald-900/30 opacity-70'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="mt-1">
                                {task.status === 'completed' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : idx === activeTaskIndex ? (
                                    status === AgentStatus.AWAITING_APPROVAL ? 
                                    <ShieldAlert className="w-5 h-5 text-blue-400 animate-bounce" /> :
                                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-600" />
                                )}
                            </div>
                            <div>
                                <h4 className={`font-semibold ${task.status === 'completed' ? 'text-emerald-400 line-through' : 'text-slate-200'}`}>
                                    {task.title}
                                </h4>
                                <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                                <div className="flex gap-4 mt-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                                        Agent: {task.assignedAgent}
                                    </span>
                                    <span>Est: {task.estimatedTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Bar for Active Task */}
                    {idx === activeTaskIndex && status === AgentStatus.EXECUTING && (
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-progress w-full rounded-b-lg"></div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default RecoveryOps;
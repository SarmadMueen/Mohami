        }

        if (data) {
          setCaseDetails(data);
          setLoading(false);
          setMinLoadFinished(true);
        }
      } catch (error) {
        console.error('Error loading case:', error);
        setLoading(false);
      }
    };

    loadCaseDetails();
  }, [router.isReady, caseId, caseNumber]);

  // Handle tab query parameter from URL
  useEffect(() => {
    if (router.query.tab && router.isReady && (caseId || caseNumber)) {
      const tab = router.query.tab;

      // Handle 'jobTasks' tab
      if (tab === 'jobTasks') {
        setActiveView('jobTasks');
        setHighlightedButton('jobTasks');
        // Delay fetchTasks slightly to ensure component is ready
        setTimeout(async () => {
          await fetchTasks();

          // Handle Highlighting if requested
          const highlightType = router.query.highlightType;
          const highlightId = router.query.highlightId;

          if (highlightType === 'task' && highlightId) {
            setHighlightedTaskId(parseInt(highlightId));

            // Scroll after render (tasks might take a moment to appear)
            setTimeout(() => {
              const element = document.querySelector(`[data-task-id="${highlightId}"]`) || document.getElementById(`task-${highlightId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Optional: Clear highlight after a few seconds
                setTimeout(() => setHighlightedTaskId(null), 5000);
              }
            }, 800); // Slightly longer delay for tasks
          }
        }, 100);
      }
      // Handle 'sessions' tab
      else if (tab === 'sessions') {
        setActiveView('sessions');
        setHighlightedButton('sessions');

        setTimeout(() => {
          const fetchSessions = async () => {
            try {
              // Try to get case_number from caseDetails if available, otherwise use caseNumber or caseId
              const caseNumberToUse = caseDetails?.case_number || caseNumber || caseId;

              const user = supabase.auth.user();
              if (!user) return;

              // Check user role
              const { data: userMeta } = await supabase
                .from('user_metadata')
                .select('admin_user_id, role')
                .eq('user_id', user.id)
                .single();

              let sessionQuery = supabase
                .from('sessions')
                .select('*')
                .eq('case_number', caseNumberToUse)
                .order('sessiondate', { ascending: false });

              // No extra user restriction - if they can see the case, they can see its sessions

              const [{ data: sessions, error }, { data: attachments }] = await Promise.all([
                sessionQuery,
                supabase
                  .from('attachments')
                  .select('*')
                  .eq('case_number', caseNumberToUse)
              ]);

              if (!error && sessions) {
                // 2. Determine Case Admin ID (The Firm Owner)
                let thisCaseAdminId = caseDetails?.admin_id;

                // If we don't have the admin_id from props, fetch it using the unique case ID or number
                if (!thisCaseAdminId && (caseId || caseNumber)) {
                  const { data: cData } = await supabase
                    .from('cases')
                    .select('admin_id')
                    .eq(caseId && !isNaN(caseId) ? 'id' : 'case_number', caseId || caseNumber)
                    .single();
                  thisCaseAdminId = cData?.admin_id;
                }

                // 3. Fetch Firm User IDs (Admin + all Lawyers under this admin)
                let firmUserIds = [thisCaseAdminId];
                try {
                  const { data: firmLawyers } = await supabase
                    .from('user_metadata')
                    .select('user_id')
                    .eq('admin_user_id', thisCaseAdminId);

                  if (firmLawyers) {
                    firmUserIds = [...new Set([thisCaseAdminId, ...firmLawyers.map(l => l.user_id)])].filter(Boolean);
                  }
                } catch (err) {
                  console.error('Error fetching firm lawyers:', err);
                }

                // 4. Fetch Creator Metadata for the sessions we found
                const creatorUserIds = [...new Set((sessions || []).map(s => s.user_id).filter(Boolean))];
                let userMetadataList = [];

                if (creatorUserIds.length > 0) {
                  try {
                    const { data } = await supabase
                      .from('user_metadata')
                      .select('user_id, admin_user_id, new_lawyer_id, username')
                      .or(`user_id.in.(${creatorUserIds.join(',')}),new_lawyer_id.in.(${creatorUserIds.join(',')})`); // Filter!
                    userMetadataList = data || [];
                  } catch (err) {
                    console.error('Error fetching user metadata:', err);
                  }
                }

                // 5. Enrich session data with user names
                const enrichedSessions = sessions.map(session => {
                  // Prioritize direct Auth ID matching
                  // Only match the user's own metadata row
                  // 1. Try to match by new_lawyer_id first (for lawyers)
                  // 2. Then match by user_id, BUT exclude records that have a new_lawyer_id (to avoid picking a lawyer record when we want the admin)
                  const creator = userMetadataList.find(u => u.new_lawyer_id === session.user_id) ||
                    userMetadataList.find(u => u.user_id === session.user_id && !u.new_lawyer_id);
                  // Do NOT match against admin_user_id, as that returns a subordinate's row for an admin's action
                  return {
                    ...session,
                    user_name: session.user_name || creator?.username || 'مستخدم',
                    folderAttachments: (attachments || []).filter(att => att.session_id === session.id)
                  };
                });

                setSessionData(enrichedSessions || []);

                // Handle Session Highlighting if requested
                const highlightType = router.query.highlightType;
                const highlightId = router.query.highlightId;

                if (highlightType === 'session' && highlightId) {
                  const numericHighlightId = parseInt(highlightId);
                  setHighlightedSessionId(numericHighlightId);

                  // Function to scroll and highlight with retry
                  const scrollToSession = (retryCount = 0) => {
                    const element = document.getElementById(`session-${highlightId}`) || document.querySelector(`[data-session-id="${highlightId}"]`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Re-apply highlight just in case
                      setHighlightedSessionId(parseInt(highlightId));

                      // Clear highlight after delay
                      setTimeout(() => setHighlightedSessionId(null), 5000);
                    } else if (retryCount < 3) {
                      // Retry after another delay if element not found
                      setTimeout(() => scrollToSession(retryCount + 1), 500);
                    }
                  };

                  // Wait for DOM to update after state change
                  setTimeout(scrollToSession, 800);
                }
              }
            } catch (error) {
              console.error('Error fetching sessions:', error);
            }
          };
          fetchSessions();
        }, 100);
      }
      // Handle 'reminders' tab (implicitly or explicitly)
      else if (tab === 'reminders') {
        setActiveView('reminders');
        setHighlightedButton('reminders');

        // Check if there's a reminder_id in the URL to highlight
        const reminderId = router.query.reminderId;
        if (reminderId) {
          setIsCalendarTransition(true);
        }

        setTimeout(() => {
          if (caseDetails?.case_number) {
            fetchRemindersForCase();
          } else {
            fetchReminders();
          }

          if (reminderId) {
            const reminderIdStr = String(reminderId);
            // Wait for reminders to load, then highlight
            setTimeout(() => {
              const findAndHighlight = () => {
                const escapedId = CSS.escape(reminderIdStr);
                let reminderElement = document.querySelector(`[data-reminder-id="${escapedId}"]`);
                if (!reminderElement) reminderElement = document.querySelector(`[data-reminder-id='${escapedId}']`);
                if (!reminderElement) {
                  const allReminders = document.querySelectorAll('[data-reminder-id]');
                  for (let i = 0; i < allReminders.length; i++) {
                    if (allReminders[i].getAttribute('data-reminder-id') === reminderIdStr) {
                      reminderElement = allReminders[i];
                      break;
                    }
                  }
                }

                if (reminderElement) {
                  setHighlightedReminderId(reminderIdStr);
                  setTimeout(() => {
                    reminderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Clear transition loading after scrolling
                    setTimeout(() => setIsCalendarTransition(false), 500);
                  }, 100);
                  return true;
                }
                return false;
              };

              if (!findAndHighlight()) {
                setTimeout(() => {
                  if (!findAndHighlight()) {
                    setTimeout(() => {
                      if (!findAndHighlight()) setIsCalendarTransition(false); // Safety clear
                    }, 500);
                  }
                }, 300);
              }
              setTimeout(() => setHighlightedReminderId(null), 5000);
            }, 500);

            // Safety timeout to clear loading if anything goes wrong
            setTimeout(() => setIsCalendarTransition(false), 4000);
          }
        }, 100);
      }
    }
  }, [router.query, router.isReady, caseId, caseDetails]); // Updated dependencies

  // Set default view to caseDetails when component mounts (if no tab parameter)
  useEffect(() => {
    if (router.isReady && (caseId || caseNumber) && !router.query.tab && activeView !== 'caseDetails') {
      setActiveView('caseDetails');
      setHighlightedButton('caseDetails');
    }
  }, [router.isReady, router.query.tab, caseId]);

  // Fetch related cases when relatedCases view is active
  useEffect(() => {
    if (activeView === 'relatedCases' && caseId) {
      fetchRelatedCases();
    }
  }, [activeView, caseId]);

  // Add a new state to track the printing process
  const [isPrinting, setIsPrinting] = useState(false);

  const [courtDecisionData, setCourtDecisionData] = useState({
    courtDate: '',
    attachments: [],
    courtDetails: '',
  });
  const AmiriRegular = 'AAEAAAARAQAABAAQR0RFRg...';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState({ url: '', type: '' });

  function openModal(attachment) {
    console.log('openModal called with:', attachment);
    setCurrentFile({ url: attachment.file_url, type: attachment.file_type });
    setIsModalOpen(true);
    console.log('Modal state set to true, currentFile:', { url: attachment.file_url, type: attachment.file_type });
  }
  function closeModal() {
    setIsModalOpen(false);
    setCurrentFile({ url: '', type: '' }); // Clear the current file
  }

  // Close modal when activeView changes (user navigates to different menu item)
  const prevActiveViewRef = useRef(activeView);
  useEffect(() => {
    // If activeView changed from previous value and modal is open, close it
    if (prevActiveViewRef.current !== activeView && isModalOpen) {
      setIsModalOpen(false);
      setCurrentFile({ url: '', type: '' });
    }
    prevActiveViewRef.current = activeView;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]); // Only track activeView changes
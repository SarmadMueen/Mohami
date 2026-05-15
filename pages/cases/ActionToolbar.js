import React from 'react';
import {
  Save,
  Printer,
  FolderOpen,
  GitBranch,
  DollarSign,
  CreditCard,
  Paperclip,
  Bell,
  Scale,
  Users,
  Clock,
  Edit3,
  RefreshCw,
  Play,
  Plus,
  FileEdit,
} from "lucide-react";

// Define your toolbar actions in an array. This makes the component clean and easy to manage.
const allToolbarActions = [

  { label: "طباعة", icon: Printer, onClickProp: "onPrint", permission: null, allowReadOnly: true }, // Allow in read-only mode
  { label: "تعديل القضية", icon: FileEdit, onClickProp: "onEditCase", permission: null, allowReadOnly: false },
  { label: "الملاحظات", icon: FolderOpen, onClickProp: "onAddNote", permission: "can_add_notes", allowReadOnly: false },
  // { label: "سير العمل", icon: GitBranch, onClickProp: "onAddUpdate" },
  // { label: "ذمة", icon: DollarSign, onClickProp: "onAddFee" },
  { label: "إضافة سداد", icon: CreditCard, onClickProp: "onAddFee", permission: null, allowReadOnly: false },
  { label: "مرفق", icon: Paperclip, onClickProp: "onAddAttachment", permission: null, allowReadOnly: false },
  { label: "تذكير", icon: Bell, onClickProp: "onAddReminder", permission: null, allowReadOnly: false },
  { label: " إضافة حكم", icon: Scale, onClickProp: "onAddDecision", permission: null, allowReadOnly: false },
  { label: "مهمة وظيفية", icon: Users, onClickProp: "onAddtask", permission: null, allowReadOnly: false },
  // { label: "الموقت", icon: Clock, onClickProp: "onAddReminder" },
  { label: "ملاحظة", icon: Edit3, onClickProp: "onAddNote", permission: "can_add_notes", allowReadOnly: false },
  { label: "تحديث", icon: RefreshCw, onClickProp: "onAddUpdate", permission: "can_add_updates", allowReadOnly: false },
  { label: "إجراء", icon: Play, onClickProp: "onAddAction", permission: "can_create_action", allowReadOnly: false },
  { label: "جلسة", icon: Plus, onClickProp: "onAddSession", permission: "can_add_sessions", allowReadOnly: false },
];

const ActionToolbar = (props) => {
  const { userPermissions, isReadOnly, subLoading } = props;

  // Filter actions based on permissions and read-only mode
  const toolbarActions = allToolbarActions.filter(action => {
    // If in read-only mode, only show actions that are allowed
    if (isReadOnly && !subLoading) {
      return action.allowReadOnly === true;
    }
    // If no permission required, always show
    if (!action.permission) {
      return true;
    }
    // If permissions not loaded yet, show by default
    if (!userPermissions) {
      return true;
    }
    // Check if user has the required permission
    return userPermissions[action.permission] === true;
  });
  const handleKeyDown = (event, action) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const onClickHandler = props[action.onClickProp] || (() => console.warn(`${action.onClickProp} not provided`));
      onClickHandler();
    }
  };

  return (
    <>
      <div className="toolbar-container" dir="rtl">
        <div className="actions-wrapper">
          {toolbarActions.map((action, index) => {
            // Get the onClick function from props based on the string name
            const onClickHandler = props[action.onClickProp] || (() => console.warn(`${action.onClickProp} not provided`));
            return (
              <button
                key={action.label}
                className={`toolbar-button ${index !== 0 ? "with-separator" : ""}`}
                onClick={onClickHandler}
                onKeyDown={(e) => handleKeyDown(e, action)}
                aria-label={action.label}
              >
                <action.icon
                  className="toolbar-icon"
                  strokeWidth={1.5}
                  size={32}
                  aria-hidden="true"
                />
                <span className="toolbar-label font-arabic">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .font-arabic {
          font-family: 'Cairo', 'Almarai', sans-serif;
        }
        .toolbar-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          background: #ffffff;
          border: none;
          border-radius: 0;
          padding: 8px 4px;
          margin: 0;
          width: 100%;
          font-family: 'Cairo', 'Almarai', sans-serif;
          box-shadow: none;
          overflow: hidden;
        }
        .actions-wrapper {
          display: flex;
          align-items: center;
          gap: 2px;
          justify-content: flex-start;
          flex-wrap: nowrap;
          overflow-x: auto;
          width: 100%;
          padding: 4px 8px;
          max-width: 100%;
          -webkit-overflow-scrolling: touch;
        }
        .actions-wrapper::-webkit-scrollbar {
          height: 4px;
        }
        .actions-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }
        .actions-wrapper::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .actions-wrapper::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .toolbar-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 6px;
          background-color: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          min-width: 64px;
          flex: 0 0 auto;
          height: auto;
          position: relative;
          color: #334155;
          box-shadow: none;
          white-space: nowrap;
          text-align: center;
          transition: none;
        }
        
        /* Removed hover effects as requested */
        .toolbar-button:hover {
          background-color: transparent;
          color: #334155;
        }

        .toolbar-button.with-separator {
          border-left: none;
        }
        
        /* Icon Styles */
        :global(.toolbar-icon) {
          stroke-width: 1.5px !important;
          stroke: #2563EB !important;
          color: #2563EB !important;
          transition: none;
        }
        
        .toolbar-button:hover :global(.toolbar-icon) {
          transform: none;
          stroke: #2563EB !important;
        }

        /* SVG Overrides */
        :global(.toolbar-icon svg),
        :global(.toolbar-icon path),
        :global(.toolbar-icon line),
        :global(.toolbar-icon circle),
        :global(.toolbar-icon polyline),
        :global(.toolbar-icon polygon),
        :global(.toolbar-icon rect) {
          stroke-width: 1.5px !important;
          stroke: inherit !important;
          fill: none !important;
        }
        
        .toolbar-label {
          font-size: 13px;
          font-weight: 600;
          color: currentColor;
          line-height: 1.2;
          text-align: center;
          white-space: nowrap;
          font-family: 'Cairo', 'Almarai', sans-serif;
        }

        /* Dark Mode Support */
        :global(body.dark-mode) .toolbar-container {
          background: #1e293b;
          border-color: #334155;
        }
        :global(body.dark-mode) .toolbar-button {
          color: #cbd5e1;
        }
        :global(body.dark-mode) .toolbar-button:hover {
          background-color: #334155;
          color: #f8fafc;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .toolbar-button {
            min-width: auto;
            padding: 6px 8px;
          }
          .toolbar-label {
            font-size: 11px;
          }
          :global(.toolbar-icon) {
            width: 28px !important;
            height: 28px !important;
          }
        }
      `}</style>
    </>
  );
};

export default ActionToolbar;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
exports.Constants = {
    public: {
        Enums: {
            audit_action: ["create", "update", "delete"],
            confirmation_status: ["draft", "submitted", "approved", "rejected"],
            phase_status: ["pending", "active", "complete"],
            project_status: ["planning", "active", "on-hold", "complete"],
            pto_type: ["pto", "holiday", "half-day", "sick"],
            user_role: ["employee", "pm", "admin"],
        },
    },
};

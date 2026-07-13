# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Naming
- Package name is "Nepali Datepicker Pro". Confidence: 0.85

# Architecture
- Separate views for date-only and date+datetime pickers (not combined into one). Confidence: 0.70
- Include a month-picker as a standalone selectable component alongside date and datetime pickers. Confidence: 0.70

# UI/UX
- Time picker should ignore seconds and only show hours and minutes. Confidence: 0.65
- Use input group with switch icon for view/picker type switcher (not custom dropdown). Confidence: 0.60
- BS/AD mode toggle should be a single button with a change/swap icon that toggles, not two separate segment buttons. Confidence: 0.70
- Date-only picker and date range picker should be significantly compact — narrow width (~340px for date-only), small cells (38px height), tight padding, slim presets sidebar. Date+time picker stays at full 560px width. Confidence: 0.80
- When closeOnSelect is enabled, hide the close and apply buttons since they are unnecessary. Confidence: 0.65

# Build
- Use Vite for build setup, keep dist output outside the source tree, keep project structure clean and production-ready. Confidence: 0.65

# Documentation
- Provide a docs page with homepage, helper function documentation, and copyable code snippets for all customization options. Confidence: 0.65


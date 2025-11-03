<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Events Calendar - Add Event Attendee</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }

        body {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            min-height: 100vh;
            color: #1f2937;
            padding: 24px;
        }

        .dark body {
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: #f9fafb;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        /* Header Styles */
        .header {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 32px;
        }

        @media (min-width: 640px) {
            .header {
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
            }
        }

        .title {
            font-size: 36px;
            font-weight: 700;
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #6b7280;
            font-size: 16px;
        }

        .dark .subtitle {
            color: #9ca3af;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .btn-secondary {
            background-color: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
        }

        .dark .btn-secondary {
            background-color: #374151;
            color: #f3f4f6;
            border-color: #4b5563;
        }

        /* Card Styles */
        .card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(209, 213, 219, 0.5);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            transition: all 0.3s ease;
        }

        .dark .card {
            background: rgba(31, 41, 55, 0.7);
            border-color: rgba(75, 85, 99, 0.5);
        }

        .card:hover {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            border-color: rgba(156, 163, 175, 0.5);
        }

        .dark .card:hover {
            border-color: rgba(107, 114, 128, 0.5);
        }

        /* Form Styles */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
        }

        @media (min-width: 768px) {
            .form-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .form-label {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
        }

        .dark .form-label {
            color: #d1d5db;
        }

        .form-input {
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            background-color: white;
            font-size: 16px;
            transition: all 0.2s ease;
        }

        .dark .form-input {
            background-color: #374151;
            border-color: #4b5563;
            color: #f9fafb;
        }

        .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Search and Select Styles */
        .search-container {
            position: relative;
            margin-bottom: 16px;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.2s ease;
        }

        .dark .search-input {
            background-color: #374151;
            border-color: #4b5563;
            color: #f9fafb;
        }

        .search-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
        }

        .search-hint {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 16px;
        }

        .dark .search-hint {
            color: #9ca3af;
        }

        .results-container {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            max-height: 240px;
            overflow-y: auto;
            background: white;
        }

        .dark .results-container {
            border-color: #4b5563;
            background: #374151;
        }

        .result-item {
            padding: 16px;
            border-bottom: 1px solid #f3f4f6;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }

        .dark .result-item {
            border-bottom-color: #4b5563;
        }

        .result-item:hover {
            background-color: #f9fafb;
        }

        .dark .result-item:hover {
            background-color: #4b5563;
        }

        .result-item:last-child {
            border-bottom: none;
        }

        .result-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 4px;
        }

        .result-details {
            font-size: 14px;
            color: #6b7280;
        }

        .dark .result-details {
            color: #9ca3af;
        }

        .no-results {
            padding: 32px 16px;
            text-align: center;
            color: #6b7280;
        }

        .dark .no-results {
            color: #9ca3af;
        }

        .selected-member {
            background-color: #eff6ff;
            border: 1px solid #dbeafe;
            border-radius: 12px;
            padding: 16px;
            margin-top: 16px;
            display: none;
        }

        .dark .selected-member {
            background-color: #1e3a8a;
            border-color: #3b82f6;
        }

        .selected-member.active {
            display: block;
        }

        .selected-member-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .remove-selection {
            color: #ef4444;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }

        .avatar {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
            flex-shrink: 0;
        }

        .member-info {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }

        .member-details {
            flex: 1;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
        }

        .status-newcomer {
            background-color: #dbeafe;
            color: #1e40af;
        }

        .dark .status-newcomer {
            background-color: #1e3a8a;
            color: #93c5fd;
        }

        .status-signed_member {
            background-color: #dcfce7;
            color: #166534;
        }

        .dark .status-signed_member {
            background-color: #14532d;
            color: #86efac;
        }

        .status-not_attending {
            background-color: #fee2e2;
            color: #991b1b;
        }

        .dark .status-not_attending {
            background-color: #7f1d1d;
            color: #fca5a5;
        }

        .first-time-badge {
            background-color: #dcfce7;
            color: #166534;
            padding: 4px 8px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
        }

        .dark .first-time-badge {
            background-color: #14532d;
            color: #86efac;
        }

        /* Actions */
        .actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
            justify-content: flex-end;
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .checkbox {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            border: 2px solid #d1d5db;
            background: white;
            cursor: pointer;
        }

        .dark .checkbox {
            background: #374151;
            border-color: #6b7280;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error-message {
            background-color: #fef2f2;
            color: #dc2626;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid #fecaca;
            display: none;
        }

        .dark .error-message {
            background-color: #7f1d1d;
            color: #fca5a5;
            border-color: #991b1b;
        }

        .error-message.active {
            display: block;
        }

        .success-message {
            background-color: #f0fdf4;
            color: #16a34a;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid #bbf7d0;
            display: none;
        }

        .dark .success-message {
            background-color: #14532d;
            color: #4ade80;
            border-color: #16a34a;
        }

        .success-message.active {
            display: block;
        }

        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <h1 class="title">Events Calendar</h1>
                <p class="subtitle">Manage church events and track attendance</p>
            </div>
            <button class="btn btn-primary" id="showEventFormBtn">
                <i data-lucide="plus"></i>
                <span>Create Event</span>
            </button>
        </div>

        <!-- Messages -->
        <div class="error-message" id="errorMessage"></div>
        <div class="success-message" id="successMessage"></div>

        <!-- Event Creation Form -->
        <div class="card hidden" id="eventFormCard">
            <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #111827;">Create New Event</h2>
            <form id="eventForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Event Name *</label>
                        <input type="text" class="form-input" id="eventName" placeholder="Enter event name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Topic</label>
                        <input type="text" class="form-input" id="eventTopic" placeholder="Event topic or theme">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Date *</label>
                        <input type="date" class="form-input" id="eventDate" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Time *</label>
                        <input type="time" class="form-input" id="eventTime" required>
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label class="form-label">Location</label>
                        <input type="text" class="form-input" id="eventLocation" placeholder="Event location">
                    </div>
                </div>
                <div class="actions">
                    <button type="submit" class="btn btn-primary" id="createEventBtn">
                        Create Event
                    </button>
                    <button type="button" class="btn btn-secondary" id="cancelEventBtn">
                        Cancel
                    </button>
                </div>
            </form>
        </div>

        <!-- Add Event Attendee Form -->
        <div class="card" id="attendeeFormCard">
            <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #111827;">Add Event Attendee</h2>
            
            <form id="attendeeForm">
                <!-- Event Selection -->
                <div class="form-group" style="margin-bottom: 24px;">
                    <label class="form-label">Select Event *</label>
                    <select class="form-input" id="eventSelect" required>
                        <option value="">Choose an event...</option>
                    </select>
                </div>

                <!-- Member Search and Selection -->
                <div class="form-group">
                    <label class="form-label">Search and Select Member *</label>
                    <div class="search-hint">Type to search members by name, surname, email, or phone number</div>
                    
                    <div class="search-container">
                        <i data-lucide="search" class="search-icon"></i>
                        <input type="text" class="search-input" id="searchInput" placeholder="Type to search members...">
                    </div>
                    
                    <div class="results-container" id="resultsContainer">
                        <div class="no-results">Start typing to search for members</div>
                    </div>
                    
                    <div class="selected-member" id="selectedMember">
                        <div class="selected-member-header">
                            <div class="result-name">Selected Member</div>
                            <div class="remove-selection" id="removeSelection">Remove</div>
                        </div>
                        <div class="member-info">
                            <div class="avatar" id="memberAvatar"></div>
                            <div class="member-details">
                                <div id="selectedMemberName" style="font-weight: 600; margin-bottom: 4px;"></div>
                                <div id="selectedMemberContact" style="font-size: 14px; color: #6b7280; margin-bottom: 8px;"></div>
                                <div id="selectedMemberStatus" class="status-badge"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Additional Fields -->
                <div class="form-grid" style="margin-top: 24px;">
                    <div class="form-group">
                        <label class="form-label">Invited By</label>
                        <input type="text" class="form-input" id="invitedBy" placeholder="Who invited this member?">
                    </div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="firstTime" class="checkbox">
                        <label for="firstTime" class="form-label">First Time Attending this Event</label>
                    </div>
                </div>

                <div class="actions">
                    <button type="submit" class="btn btn-primary" id="addAttendeeBtn" disabled>
                        <i data-lucide="users"></i>
                        <span>Add Attendee</span>
                    </button>
                    <button type="button" class="btn btn-secondary" id="cancelAttendeeBtn">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        // Supabase configuration
        const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase URL
        const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase anon key
        
        // Initialize Supabase client
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // DOM elements
        const eventFormCard = document.getElementById('eventFormCard');
        const attendeeFormCard = document.getElementById('attendeeFormCard');
        const showEventFormBtn = document.getElementById('showEventFormBtn');
        const eventForm = document.getElementById('eventForm');
        const attendeeForm = document.getElementById('attendeeForm');
        const eventSelect = document.getElementById('eventSelect');
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('resultsContainer');
        const selectedMember = document.getElementById('selectedMember');
        const selectedMemberName = document.getElementById('selectedMemberName');
        const selectedMemberContact = document.getElementById('selectedMemberContact');
        const selectedMemberStatus = document.getElementById('selectedMemberStatus');
        const memberAvatar = document.getElementById('memberAvatar');
        const removeSelection = document.getElementById('removeSelection');
        const addAttendeeBtn = document.getElementById('addAttendeeBtn');
        const cancelEventBtn = document.getElementById('cancelEventBtn');
        const cancelAttendeeBtn = document.getElementById('cancelAttendeeBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        // State
        let events = [];
        let members = [];
        let selectedMemberData = null;
        let searchTimeout = null;

        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            fetchEvents();
            fetchMembers();
            setupEventListeners();
        });

        function setupEventListeners() {
            // Event form toggle
            showEventFormBtn.addEventListener('click', function() {
                eventFormCard.classList.toggle('hidden');
                attendeeFormCard.classList.toggle('hidden');
                this.querySelector('span').textContent = 
                    eventFormCard.classList.contains('hidden') ? 'Create Event' : 'Cancel';
            });

            // Cancel event form
            cancelEventBtn.addEventListener('click', function() {
                eventFormCard.classList.add('hidden');
                attendeeFormCard.classList.remove('hidden');
                showEventFormBtn.querySelector('span').textContent = 'Create Event';
                eventForm.reset();
            });

            // Cancel attendee form
            cancelAttendeeBtn.addEventListener('click', function() {
                resetAttendeeForm();
            });

            // Event form submission
            eventForm.addEventListener('submit', handleEventSubmit);

            // Attendee form submission
            attendeeForm.addEventListener('submit', handleAttendeeSubmit);

            // Member search
            searchInput.addEventListener('input', handleMemberSearch);

            // Remove member selection
            removeSelection.addEventListener('click', function() {
                selectedMemberData = null;
                selectedMember.classList.remove('active');
                addAttendeeBtn.disabled = true;
                searchInput.value = '';
            });
        }

        // Fetch events from Supabase
        async function fetchEvents() {
            try {
                const { data, error } = await supabaseClient
                    .from('events')
                    .select('*')
                    .order('event_date', { ascending: true });

                if (error) {
                    throw error;
                }

                events = data || [];
                populateEventSelect();
            } catch (error) {
                console.error('Error fetching events:', error);
                showError('Failed to load events. Please check your connection.');
            }
        }

        // Fetch members from Supabase
        async function fetchMembers() {
            try {
                const { data, error } = await supabaseClient
                    .from('members')
                    .select(`
                        id,
                        name,
                        surname,
                        email,
                        phone,
                        cell_group_id,
                        status,
                        cell_groups (
                            name
                        ),
                        ministry_groups (
                            name
                        )
                    `)
                    .order('name')
                    .order('surname');

                if (error) {
                    throw error;
                }

                members = data || [];
                console.log('Fetched members:', members.length);
            } catch (error) {
                console.error('Error fetching members:', error);
                showError('Failed to load members. Please check your connection.');
            }
        }

        // Populate event dropdown
        function populateEventSelect() {
            eventSelect.innerHTML = '<option value="">Choose an event...</option>';
            
            events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = `${event.name} - ${formatDate(event.event_date)}`;
                eventSelect.appendChild(option);
            });
        }

        // Handle event form submission
        async function handleEventSubmit(e) {
            e.preventDefault();
            
            const eventName = document.getElementById('eventName').value;
            const eventTopic = document.getElementById('eventTopic').value;
            const eventDate = document.getElementById('eventDate').value;
            const eventTime = document.getElementById('eventTime').value;
            const eventLocation = document.getElementById('eventLocation').value;

            if (!eventName || !eventDate || !eventTime) {
                showError('Please fill in all required fields');
                return;
            }

            const createEventBtn = document.getElementById('createEventBtn');
            createEventBtn.innerHTML = '<span class="loading"></span> Creating...';
            createEventBtn.disabled = true;

            try {
                const { error } = await supabaseClient
                    .from('events')
                    .insert({
                        name: eventName,
                        topic: eventTopic || null,
                        event_date: eventDate,
                        event_time: eventTime,
                        location: eventLocation || null,
                    });

                if (error) {
                    throw error;
                }

                showSuccess('Event created successfully!');
                eventForm.reset();
                eventFormCard.classList.add('hidden');
                attendeeFormCard.classList.remove('hidden');
                showEventFormBtn.querySelector('span').textContent = 'Create Event';
                
                // Refresh events list
                await fetchEvents();
            } catch (error) {
                console.error('Error creating event:', error);
                showError('Failed to create event. Please try again.');
            } finally {
                createEventBtn.innerHTML = 'Create Event';
                createEventBtn.disabled = false;
            }
        }

        // Handle member search
        function handleMemberSearch() {
            const searchTerm = this.value.trim();
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            // Set a new timeout to debounce the search
            searchTimeout = setTimeout(() => {
                if (searchTerm.length === 0) {
                    resultsContainer.innerHTML = '<div class="no-results">Start typing to search for members</div>';
                    return;
                }
                
                searchMembers(searchTerm);
            }, 300);
        }

        // Search members in Supabase
        function searchMembers(searchTerm) {
            const searchLower = searchTerm.toLowerCase().trim();
            
            const filteredMembers = members.filter(member => {
                return (
                    member.name.toLowerCase().includes(searchLower) ||
                    member.surname.toLowerCase().includes(searchLower) ||
                    `${member.name} ${member.surname}`.toLowerCase().includes(searchLower) ||
                    member.phone?.toLowerCase().includes(searchLower) ||
                    member.email?.toLowerCase().includes(searchLower)
                );
            });

            // Display results
            if (filteredMembers.length > 0) {
                resultsContainer.innerHTML = '';
                filteredMembers.forEach(member => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    resultItem.innerHTML = `
                        <div class="result-name">${member.name} ${member.surname}</div>
                        <div class="result-details">
                            ${member.email || 'No email'} • ${member.phone || 'No phone'}
                            ${member.cell_groups?.name ? ` • ${member.cell_groups.name}` : ''}
                        </div>
                    `;
                    resultItem.addEventListener('click', () => selectMember(member));
                    resultsContainer.appendChild(resultItem);
                });
            } else {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        No members found matching "${searchTerm}"<br>
                        Try a different search term
                    </div>
                `;
            }
        }

        // Select a member
        function selectMember(member) {
            selectedMemberData = member;
            
            // Update selected member display
            selectedMemberName.textContent = `${member.name} ${member.surname}`;
            
            let contactInfo = [];
            if (member.email) contactInfo.push(member.email);
            if (member.phone) contactInfo.push(member.phone);
            selectedMemberContact.textContent = contactInfo.join(' • ') || 'No contact information';
            
            // Set status badge
            selectedMemberStatus.textContent = getStatusText(member.status);
            selectedMemberStatus.className = `status-badge status-${member.status || 'newcomer'}`;
            
            // Set avatar
            memberAvatar.textContent = getInitials(member.name, member.surname);
            
            // Show selected member section
            selectedMember.classList.add('active');
            
            // Clear search and results
            searchInput.value = '';
            resultsContainer.innerHTML = '<div class="no-results">Start typing to search for members</div>';
            
            // Enable add attendee button
            addAttendeeBtn.disabled = false;
        }

        // Handle attendee form submission
        async function handleAttendeeSubmit(e) {
            e.preventDefault();
            
            const eventId = eventSelect.value;
            
            if (!eventId) {
                showError('Please select an event');
                return;
            }
            
            if (!selectedMemberData) {
                showError('Please select a member');
                return;
            }

            const invitedBy = document.getElementById('invitedBy').value;
            const firstTime = document.getElementById('firstTime').checked;

            // Show loading state
            addAttendeeBtn.innerHTML = '<span class="loading"></span> Adding...';
            addAttendeeBtn.disabled = true;

            try {
                const { error } = await supabaseClient
                    .from('event_attendees')
                    .insert({
                        event_id: eventId,
                        member_id: selectedMemberData.id,
                        first_time: firstTime,
                        invited_by: invitedBy || null,
                    });

                if (error) {
                    throw error;
                }

                showSuccess('Attendee added successfully!');
                resetAttendeeForm();
            } catch (error) {
                console.error('Error adding attendee:', error);
                showError('Failed to add attendee. Please try again.');
                addAttendeeBtn.innerHTML = '<i data-lucide="users"></i><span>Add Attendee</span>';
                addAttendeeBtn.disabled = false;
                lucide.createIcons();
            }
        }

        // Reset attendee form
        function resetAttendeeForm() {
            selectedMemberData = null;
            selectedMember.classList.remove('active');
            searchInput.value = '';
            resultsContainer.innerHTML = '<div class="no-results">Start typing to search for members</div>';
            document.getElementById('invitedBy').value = '';
            document.getElementById('firstTime').checked = false;
            eventSelect.value = '';
            addAttendeeBtn.disabled = true;
            addAttendeeBtn.innerHTML = '<i data-lucide="users"></i><span>Add Attendee</span>';
            lucide.createIcons();
        }

        // Utility functions
        function getInitials(name, surname) {
            return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
        }

        function getStatusText(status) {
            const statusMap = {
                newcomer: 'Newcomer',
                signed_member: 'Signed Member',
                not_attending: 'Not Attending'
            };
            return statusMap[status] || 'Newcomer';
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('active');
            
            // Hide error after 5 seconds
            setTimeout(() => {
                errorMessage.classList.remove('active');
            }, 5000);
        }

        function showSuccess(message) {
            successMessage.textContent = message;
            successMessage.classList.add('active');
            
            // Hide success after 3 seconds
            setTimeout(() => {
                successMessage.classList.remove('active');
            }, 3000);
        }

        // Test connection on load
        async function testConnection() {
            try {
                const { data, error } = await supabaseClient
                    .from('members')
                    .select('count')
                    .limit(1);

                if (error) {
                    throw error;
                }
                
                console.log('Supabase connection successful');
            } catch (error) {
                console.error('Supabase connection failed:', error);
                showError('Connection to database failed. Please check your configuration.');
            }
        }

        // Initialize the app
        testConnection();
    </script>
</body>
</html>

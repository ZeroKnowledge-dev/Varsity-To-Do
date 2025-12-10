// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    onSnapshot, 
    query, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyB_YjFX5dfWdH0XdnZBKZQlZqsfBIqxPCU",
    authDomain: "varsity-to-do.firebaseapp.com",
    projectId: "varsity-to-do",
    storageBucket: "varsity-to-do.firebasestorage.app",
    messagingSenderId: "991706733096",
    appId: "1:991706733096:web:2ab2bc1a572029372b731d",
    measurementId: "G-QYQM59K5GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksRef = collection(db, 'tasks');

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let currentFilter = 'all';
let currentSort = 'date-asc';
let editingTaskId = null;
let deletingTaskId = null;
let allTasks = [];

// ==========================================
// THEME MANAGEMENT
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Add animation effect
    document.querySelector('.theme-toggle').style.animation = 'none';
    setTimeout(() => {
        document.querySelector('.theme-toggle').style.animation = '';
    }, 10);
};

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// ==========================================
// REAL-TIME LISTENER
// ==========================================
// Listen to Firestore changes in real-time
const q = query(tasksRef, orderBy('date', 'asc'));
onSnapshot(q, (snapshot) => {
    allTasks = [];
    snapshot.forEach((doc) => {
        allTasks.push({
            id: doc.id,
            ...doc.data()
        });
    });
    renderTasks();
    updateStats();
});

// ==========================================
// UPDATE STATISTICS
// ==========================================
function updateStats() {
    const totalTasks = allTasks.length;
    const pendingTasks = allTasks.filter(t => !t.completed).length;
    
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('pending-count').textContent = pendingTasks;
}

// ==========================================
// RENDER TASKS
// ==========================================
function renderTasks() {
    const pendingContainer = document.getElementById('pending-tasks');
    const completedContainer = document.getElementById('completed-tasks');
    const completedSection = document.getElementById('completed-section');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search-input');
    
    // Get search query
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    // Filter tasks based on current filter and search
    let filteredTasks = allTasks.filter(task => {
        // Search filter
        const matchesSearch = !searchQuery || 
            task.subject.toLowerCase().includes(searchQuery) ||
            task.topic.toLowerCase().includes(searchQuery);
        
        // Type filter
        let matchesFilter = true;
        if (currentFilter !== 'all') {
            if (currentFilter === 'pending') {
                matchesFilter = !task.completed;
            } else {
                matchesFilter = task.type === currentFilter;
            }
        }
        
        return matchesSearch && matchesFilter;
    });
    
    // Sort tasks
    filteredTasks.sort((a, b) => {
        if (currentSort === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else {
            return new Date(b.date) - new Date(a.date);
        }
    });
    
    // Separate pending and completed
    const pending = filteredTasks.filter(t => !t.completed);
    const completed = filteredTasks.filter(t => t.completed);
    
    // Render pending tasks
    pendingContainer.innerHTML = '';
    if (pending.length > 0) {
        pending.forEach(task => {
            pendingContainer.innerHTML += createTaskCard(task);
        });
    }
    
    // Render completed tasks
    completedContainer.innerHTML = '';
    if (completed.length > 0) {
        completed.forEach(task => {
            completedContainer.innerHTML += createTaskCard(task);
        });
    }
    
    // Update completed count
    document.getElementById('completed-count').textContent = completed.length;
    
    // Show/hide sections
    if (completed.length > 0) {
        completedSection.style.display = 'block';
    } else {
        completedSection.style.display = 'none';
    }
    
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
        pendingContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        pendingContainer.style.display = 'grid';
    }
}

// ==========================================
// CREATE TASK CARD HTML
// ==========================================
function createTaskCard(task) {
    const date = new Date(task.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    // Check if task is overdue
    const isOverdue = !task.completed && taskDate < today;
    const dateClass = isOverdue ? 'style="color: var(--danger); font-weight: 700;"' : '';
    
    return `
        <div class="task-card ${task.type} ${task.completed ? 'completed' : ''}">
            <div class="task-header">
                <span class="task-type ${task.type}">${task.type}</span>
                <div class="task-actions">
                    <button onclick="editTask('${task.id}')" title="Edit task" aria-label="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="openDeleteModal('${task.id}')" title="Delete task" aria-label="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="task-subject">${escapeHtml(task.subject)}</div>
            <div class="task-topic">${escapeHtml(task.topic)}</div>
            <div class="task-footer">
                <div class="task-date" ${dateClass}>
                    <i class="fas fa-calendar${isOverdue ? '-times' : ''}"></i>
                    ${formattedDate}${isOverdue ? ' (Overdue)' : ''}
                </div>
                <input type="checkbox" 
                       class="checkbox" 
                       ${task.completed ? 'checked' : ''} 
                       onchange="toggleComplete('${task.id}', ${!task.completed})"
                       aria-label="Mark as ${task.completed ? 'incomplete' : 'complete'}">
            </div>
        </div>
    `;
}

// ==========================================
// ESCAPE HTML TO PREVENT XSS
// ==========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// MODAL FUNCTIONS
// ==========================================
window.openModal = function(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const title = document.getElementById('modal-title');
    const btnText = document.getElementById('btn-text');
    
    if (taskId) {
        // Edit mode
        editingTaskId = taskId;
        const task = allTasks.find(t => t.id === taskId);
        
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Task';
        btnText.textContent = 'Update Task';
        
        document.getElementById('subject').value = task.subject;
        document.getElementById('topic').value = task.topic;
        document.getElementById('type').value = task.type;
        document.getElementById('date').value = task.date;
    } else {
        // Add mode
        editingTaskId = null;
        title.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Task';
        btnText.textContent = 'Add Task';
        form.reset();
    }
    
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
        document.getElementById('subject').focus();
    }, 300);
};

window.closeModal = function() {
    const modal = document.getElementById('task-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    editingTaskId = null;
    document.getElementById('task-form').reset();
};

// ==========================================
// DELETE MODAL FUNCTIONS
// ==========================================
window.openDeleteModal = function(taskId) {
    deletingTaskId = taskId;
    const modal = document.getElementById('delete-modal');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
};

window.closeDeleteModal = function() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    deletingTaskId = null;
};

window.confirmDelete = async function() {
    if (deletingTaskId) {
        try {
            await deleteDoc(doc(db, 'tasks', deletingTaskId));
            closeDeleteModal();
            showNotification('Task deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Error deleting task', 'error');
        }
    }
};

// ==========================================
// FORM SUBMISSION
// ==========================================
document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskData = {
        subject: document.getElementById('subject').value.trim(),
        topic: document.getElementById('topic').value.trim(),
        type: document.getElementById('type').value,
        date: document.getElementById('date').value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    try {
        if (editingTaskId) {
            // Update existing task
            await updateDoc(doc(db, 'tasks', editingTaskId), taskData);
            showNotification('Task updated successfully', 'success');
        } else {
            // Add new task
            await addDoc(tasksRef, taskData);
            showNotification('Task added successfully', 'success');
        }
        closeModal();
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification('Error saving task', 'error');
    }
});

// ==========================================
// TASK ACTIONS
// ==========================================
window.editTask = function(taskId) {
    openModal(taskId);
};

window.toggleComplete = async function(taskId, completed) {
    try {
        await updateDoc(doc(db, 'tasks', taskId), { completed });
        showNotification(
            completed ? 'Task marked as completed' : 'Task marked as pending',
            'success'
        );
    } catch (error) {
        console.error('Error updating task:', error);
        showNotification('Error updating task', 'error');
    }
};

// ==========================================
// COLLAPSIBLE SECTION
// ==========================================
window.toggleCompleted = function() {
    const content = document.getElementById('completed-tasks');
    const icon = document.getElementById('collapse-icon');
    
    content.classList.toggle('open');
    
    if (content.classList.contains('open')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
};

// ==========================================
// FILTER CHIPS
// ==========================================
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', function() {
        // Update active chip
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        
        // Update filter
        currentFilter = this.dataset.filter;
        renderTasks();
    });
});

// ==========================================
// SORT BUTTONS
// ==========================================
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Update active button
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // Update sort
        currentSort = this.dataset.sort;
        renderTasks();
    });
});

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.querySelector('.clear-search');

searchInput.addEventListener('input', function() {
    if (this.value.trim()) {
        clearSearchBtn.style.display = 'flex';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    renderTasks();
});

window.clearSearch = function() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderTasks();
};

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 5rem;
        right: 1rem;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: var(--shadow-xl);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', function(e) {
    // Open modal with Ctrl/Cmd + N
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
    
    // Close modal with Escape
    if (e.key === 'Escape') {
        closeModal();
        closeDeleteModal();
    }
});

// ==========================================
// INITIALIZE APP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    // Set minimum date to today for date input
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
    
    console.log('🎉 Task Manager initialized successfully!');
});
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, takeUntil } from 'rxjs';

import { Assistant } from '../../../core/services/assistant.service';
import { ToolService, Tool, AssistantTool, CreateToolRequest, AddToolToAssistantRequest } from '../../../core/services/tool.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-assistant-tools',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule
  ],
  templateUrl: './assistant-tools.component.html',
  styleUrls: ['./assistant-tools.component.scss']
})
export class AssistantToolsComponent implements OnInit, OnDestroy {
  @Input() assistant: Assistant | null = null;

  private destroy$ = new Subject<void>();

  // Data
  availableTools: Tool[] = [];
  assignedTools: AssistantTool[] = [];
  
  // UI State
  isLoading = false;
  showAddToolDialog = false;
  showCreateToolDialog = false;
  
  // Add tool form
  selectedToolId: string = '';
  toolEnabled = true;
  toolPriority = 0;
  
  // Create tool form
  newTool: CreateToolRequest = {
    name: '',
    description: '',
    method: 'GET',
    url: '',
    headers: [],
    parameters: [],
    body_schema: '',
    timeout_seconds: 30,
    retry_count: 3
  };
  
  // Table columns
  assignedToolsColumns = ['name', 'method', 'url', 'enabled', 'priority', 'actions'];

  constructor(
    private toolService: ToolService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.assistant) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private get organizationId(): string {
    const user = this.authService.getCurrentUser();
    return user?.organization_id || '';
  }

  private loadData(): void {
    if (!this.assistant || !this.organizationId) return;

    this.isLoading = true;
    
    // Load assigned tools
    this.toolService.getAssistantTools(this.organizationId, this.assistant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tools) => {
          this.assignedTools = tools;
          this.loadAvailableTools();
        },
        error: (error) => {
          console.error('Error loading assigned tools:', error);
          this.snackBar.open('Failed to load assigned tools', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  private loadAvailableTools(): void {
    if (!this.assistant || !this.organizationId) {
      this.isLoading = false;
      return;
    }

    this.toolService.getAvailableToolsForAssistant(this.organizationId, this.assistant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tools) => {
          this.availableTools = tools;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading available tools:', error);
          this.snackBar.open('Failed to load available tools', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      });
  }

  openAddToolDialog(): void {
    this.showAddToolDialog = true;
    this.selectedToolId = '';
    this.toolEnabled = true;
    this.toolPriority = 0;
  }

  closeAddToolDialog(): void {
    this.showAddToolDialog = false;
  }

  addToolToAssistant(): void {
    if (!this.selectedToolId || !this.assistant || !this.organizationId) return;

    const toolData: AddToolToAssistantRequest = {
      tool_id: this.selectedToolId,
      is_enabled: this.toolEnabled,
      priority: this.toolPriority
    };

    this.toolService.addToolToAssistant(this.organizationId, this.assistant.id, toolData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Tool added to assistant successfully', 'Close', { duration: 3000 });
          this.closeAddToolDialog();
          this.loadData();
        },
        error: (error) => {
          console.error('Error adding tool to assistant:', error);
          this.snackBar.open('Failed to add tool to assistant', 'Close', { duration: 3000 });
        }
      });
  }

  openCreateToolDialog(): void {
    this.showCreateToolDialog = true;
    this.newTool = {
      name: '',
      description: '',
      method: 'GET',
      url: '',
      headers: [],
      parameters: [],
      body_schema: '',
      timeout_seconds: 30,
      retry_count: 3
    };
  }

  closeCreateToolDialog(): void {
    this.showCreateToolDialog = false;
  }

  createTool(): void {
    if (!this.organizationId) return;

    this.toolService.createTool(this.organizationId, this.newTool)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Tool created successfully', 'Close', { duration: 3000 });
          this.closeCreateToolDialog();
          this.loadData();
        },
        error: (error) => {
          console.error('Error creating tool:', error);
          this.snackBar.open('Failed to create tool', 'Close', { duration: 3000 });
        }
      });
  }

  toggleToolEnabled(assistantTool: AssistantTool): void {
    if (!this.organizationId) return;

    const updateData = {
      is_enabled: !assistantTool.is_enabled
    };

    this.toolService.updateAssistantTool(this.organizationId, assistantTool.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          assistantTool.is_enabled = !assistantTool.is_enabled;
          this.snackBar.open('Tool status updated', 'Close', { duration: 2000 });
        },
        error: (error) => {
          console.error('Error updating tool status:', error);
          this.snackBar.open('Failed to update tool status', 'Close', { duration: 3000 });
        }
      });
  }

  removeToolFromAssistant(assistantTool: AssistantTool): void {
    if (!this.organizationId) return;

    this.toolService.removeToolFromAssistant(this.organizationId, assistantTool.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Tool removed from assistant', 'Close', { duration: 3000 });
          this.loadData();
        },
        error: (error) => {
          console.error('Error removing tool from assistant:', error);
          this.snackBar.open('Failed to remove tool from assistant', 'Close', { duration: 3000 });
        }
      });
  }

  getMethodColor(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET': return 'primary';
      case 'POST': return 'accent';
      case 'PUT': return 'warn';
      case 'DELETE': return 'warn';
      default: return 'primary';
    }
  }

  getSelectedTool(): Tool | undefined {
    return this.availableTools.find(tool => tool.id === this.selectedToolId);
  }

  // Dynamic field visibility methods
  shouldShowParameters(): boolean {
    return ['GET', 'DELETE'].includes(this.newTool.method?.toUpperCase() || '');
  }

  shouldShowRequestBody(): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(this.newTool.method?.toUpperCase() || '');
  }

  // Parameter management methods
  addParameter(): void {
    this.newTool.parameters.push({
      name: '',
      type: 'string',
      description: '',
      required: false
    });
  }

  removeParameter(index: number): void {
    this.newTool.parameters.splice(index, 1);
  }

  // Header management methods
  addHeader(): void {
    this.newTool.headers.push({
      key: '',
      value: ''
    });
  }

  removeHeader(index: number): void {
    this.newTool.headers.splice(index, 1);
  }

  // Reset form when method changes
  onMethodChange(): void {
    // Clear parameters when switching to methods that don't use them
    if (!this.shouldShowParameters()) {
      this.newTool.parameters = [];
    }
    
    // Clear body schema when switching to methods that don't use it
    if (!this.shouldShowRequestBody()) {
      this.newTool.body_schema = '';
    }
  }
}

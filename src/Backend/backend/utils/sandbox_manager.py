"""
Sandbox Manager - 管理 .sandbox 目录的创建和项目文件处理

主要功能：
1. 创建和管理 .sandbox 目录
2. 扫描和解析项目文件结构
3. 支持 HTML 和 React 项目
4. 处理文件/文件夹的区别逻辑
"""

import os
import json
import shutil
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import mimetypes
from dataclasses import dataclass


@dataclass
class ProjectInfo:
    """项目信息数据类"""
    path: str
    name: str
    type: str  # 'project' | 'file'
    project_type: str  # 'html' | 'react' | 'javascript' | 'typescript' | 'vue' | 'angular'
    files: Dict[str, str]
    dependencies: Dict[str, str]
    dev_dependencies: Dict[str, str]
    entry: List[str]
    size: Optional[int] = None
    last_modified: Optional[str] = None


class SandboxManager:
    """Sandbox 目录管理器"""
    
    def __init__(self, workspace_root: str = None):
        """
        初始化 SandboxManager
        
        Args:
            workspace_root: 工作空间根目录，如果为 None 则使用当前工作目录
        """
        self.workspace_root = Path(workspace_root) if workspace_root else Path.cwd()
        self.sandbox_dir = self.workspace_root / '.sandbox'
        
        # 支持的文件扩展名映射
        self.extension_map = {
            '.html': 'html',
            '.htm': 'html',
            '.js': 'javascript',
            '.jsx': 'react',
            '.ts': 'typescript',
            '.tsx': 'react',
            '.vue': 'vue',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'scss',
            '.less': 'less',
            '.json': 'json',
            '.md': 'markdown'
        }
        
        # 项目类型检测规则
        self.project_detection_rules = [
            ('react', ['package.json'], ['react', '@types/react', 'react-dom']),
            ('vue', ['package.json'], ['vue', '@vue/cli', 'vite']),
            ('angular', ['package.json', 'angular.json'], ['@angular/core', '@angular/cli']),
            ('typescript', ['tsconfig.json', 'package.json'], ['typescript', '@types/']),
            ('javascript', ['package.json'], []),
            ('html', ['index.html', '*.html'], [])
        ]

    def ensure_sandbox_directory(self, target_path: str) -> Path:
        """
        确保 .sandbox 目录存在
        
        Args:
            target_path: 目标路径（文件或目录）
            
        Returns:
            .sandbox 目录的路径
        """
        target = Path(target_path)
        
        if target.is_file():
            # 如果是文件，在文件的父目录创建 .sandbox
            sandbox_path = target.parent / '.sandbox'
        else:
            # 如果是目录，在目录内创建 .sandbox
            sandbox_path = target / '.sandbox'
        
        sandbox_path.mkdir(exist_ok=True)
        return sandbox_path

    def detect_project_type(self, path: Path) -> str:
        """
        检测项目类型
        
        Args:
            path: 项目路径
            
        Returns:
            项目类型字符串
        """
        if path.is_file():
            # 单文件检测
            suffix = path.suffix.lower()
            return self.extension_map.get(suffix, 'javascript')
        
        # 项目目录检测
        for project_type, files, dependencies in self.project_detection_rules:
            # 检查关键文件是否存在
            has_required_files = False
            for file_pattern in files:
                if '*' in file_pattern:
                    # 通配符匹配
                    pattern = file_pattern.replace('*', '')
                    if any(f.name.endswith(pattern) for f in path.glob('*')):
                        has_required_files = True
                        break
                else:
                    # 精确匹配
                    if (path / file_pattern).exists():
                        has_required_files = True
                        break
            
            if not has_required_files:
                continue
                
            # 检查 package.json 中的依赖
            if 'package.json' in files:
                package_json = path / 'package.json'
                if package_json.exists():
                    try:
                        with open(package_json, 'r', encoding='utf-8') as f:
                            package_data = json.load(f)
                            
                        all_deps = {
                            **package_data.get('dependencies', {}),
                            **package_data.get('devDependencies', {})
                        }
                        
                        # 检查是否包含相关依赖
                        for dep_pattern in dependencies:
                            if any(dep_pattern in dep for dep in all_deps):
                                return project_type
                    except (json.JSONDecodeError, FileNotFoundError):
                        continue
            
            # 如果没有特殊依赖要求，直接返回类型
            if not dependencies:
                return project_type
                
        return 'javascript'  # 默认类型

    def scan_project_files(self, path: Path, project_type: str) -> Dict[str, str]:
        """
        扫描项目文件
        
        Args:
            path: 项目路径
            project_type: 项目类型
            
        Returns:
            文件路径到内容的映射
        """
        files = {}
        
        if path.is_file():
            # 单文件处理
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                files[path.name] = content
            except UnicodeDecodeError:
                # 二进制文件跳过
                pass
            return files
        
        # 项目目录处理
        exclude_patterns = {
            'node_modules', '.git', '.vscode', '__pycache__', 
            'dist', 'build', '.next', '.nuxt', 'coverage',
            '.sandbox'  # 排除已存在的 sandbox 目录
        }
        
        include_extensions = {
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.htm',
            '.css', '.scss', '.sass', '.less', '.json', '.md',
            '.txt', '.yml', '.yaml', '.xml'
        }
        
        def should_include(file_path: Path) -> bool:
            """判断文件是否应该包含"""
            # 排除目录
            if any(part in exclude_patterns for part in file_path.parts):
                return False
            
            # 只包含特定扩展名的文件
            if file_path.suffix.lower() in include_extensions:
                return True
                
            # 特殊文件
            if file_path.name in ['package.json', 'tsconfig.json', 'angular.json', 'vue.config.js']:
                return True
                
            return False
        
        for file_path in path.rglob('*'):
            if file_path.is_file() and should_include(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 计算相对路径
                    relative_path = file_path.relative_to(path)
                    files[str(relative_path)] = content
                    
                except UnicodeDecodeError:
                    # 跳过二进制文件
                    continue
                except Exception as e:
                    print(f"Warning: Failed to read {file_path}: {e}")
                    continue
        
        return files

    def parse_dependencies(self, path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
        """
        解析项目依赖
        
        Args:
            path: 项目路径
            
        Returns:
            (dependencies, devDependencies) 元组
        """
        dependencies = {}
        dev_dependencies = {}
        
        package_json_path = path / 'package.json' if path.is_dir() else path.parent / 'package.json'
        
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                    
                dependencies = package_data.get('dependencies', {})
                dev_dependencies = package_data.get('devDependencies', {})
                
            except (json.JSONDecodeError, FileNotFoundError) as e:
                print(f"Warning: Failed to parse package.json: {e}")
        
        return dependencies, dev_dependencies

    def get_entry_files(self, path: Path, project_type: str) -> List[str]:
        """
        获取项目入口文件
        
        Args:
            path: 项目路径
            project_type: 项目类型
            
        Returns:
            入口文件列表
        """
        if path.is_file():
            return [path.name]
        
        entry_rules = {
            'react': ['src/index.js', 'src/index.jsx', 'src/index.ts', 'src/index.tsx'],
            'vue': ['src/main.js', 'src/main.ts', 'main.js'],
            'angular': ['src/main.ts'],
            'typescript': ['src/index.ts', 'index.ts'],
            'javascript': ['src/index.js', 'index.js', 'app.js'],
            'html': ['index.html', 'main.html', 'index.htm']
        }
        
        possible_entries = entry_rules.get(project_type, ['index.html', 'index.js'])
        
        for entry in possible_entries:
            if (path / entry).exists():
                return [entry]
        
        # 如果没有找到标准入口文件，返回第一个匹配的文件
        for pattern in ['*.html', '*.js', '*.jsx', '*.ts', '*.tsx']:
            matches = list(path.glob(pattern))
            if matches:
                return [matches[0].name]
        
        return ['index.html']  # 默认入口

    def prepare_sandbox_project(self, target_path: str) -> ProjectInfo:
        """
        准备 sandbox 项目
        
        Args:
            target_path: 目标路径
            
        Returns:
            项目信息对象
        """
        path = Path(target_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Path not found: {target_path}")
        
        # 确保 sandbox 目录存在
        sandbox_dir = self.ensure_sandbox_directory(target_path)
        
        # 检测项目类型
        project_type = self.detect_project_type(path)
        
        # 扫描文件
        files = self.scan_project_files(path, project_type)
        
        # 解析依赖
        dependencies, dev_dependencies = self.parse_dependencies(path)
        
        # 获取入口文件
        entry_files = self.get_entry_files(path, project_type)
        
        # 创建项目信息
        project_info = ProjectInfo(
            path=str(path.absolute()),
            name=path.name,
            type='project' if path.is_dir() else 'file',
            project_type=project_type,
            files=files,
            dependencies=dependencies,
            dev_dependencies=dev_dependencies,
            entry=entry_files,
            size=sum(len(content.encode('utf-8')) for content in files.values()),
            last_modified=str(path.stat().st_mtime)
        )
        
        # 保存项目配置到 sandbox 目录
        config_file = sandbox_dir / 'project.json'
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump({
                'path': project_info.path,
                'name': project_info.name,
                'type': project_info.type,
                'project_type': project_info.project_type,
                'entry': project_info.entry,
                'created_at': str(path.stat().st_mtime),
                'file_count': len(files)
            }, f, indent=2)
        
        return project_info

    def scan_available_projects(self, search_paths: List[str] = None) -> List[Dict[str, Any]]:
        """
        扫描可用的项目
        
        Args:
            search_paths: 搜索路径列表，如果为 None 则在工作空间内搜索
            
        Returns:
            项目列表
        """
        if search_paths is None:
            search_paths = [str(self.workspace_root)]
        
        projects = []
        
        for search_path in search_paths:
            search_dir = Path(search_path)
            if not search_dir.exists():
                continue
            
            # 扫描目录中的项目
            for item in search_dir.iterdir():
                if item.name.startswith('.'):
                    continue
                
                try:
                    project_type = self.detect_project_type(item)
                    
                    project_info = {
                        'path': str(item.absolute()),
                        'name': item.name,
                        'type': 'project' if item.is_dir() else 'file',
                        'projectType': project_type,
                        'size': item.stat().st_size if item.is_file() else None,
                        'lastModified': item.stat().st_mtime
                    }
                    
                    projects.append(project_info)
                    
                except Exception as e:
                    print(f"Warning: Failed to process {item}: {e}")
                    continue
        
        # 按修改时间排序
        projects.sort(key=lambda x: x['lastModified'], reverse=True)
        
        return projects

    def assemble_html_project(self, path: Path) -> str:
        """
        组装多文件HTML项目为单个完整的HTML文件
        
        Args:
            path: 项目路径
            
        Returns:
            组装后的完整HTML内容
        """
        if not path.exists():
            raise FileNotFoundError(f"Project path not found: {path}")
        
        # 扫描项目文件
        project_files = self.scan_project_files(path, 'html')
        
        # 获取主HTML文件
        main_html = None
        html_files = ['index.html', 'main.html', 'index.htm']
        
        for html_file in html_files:
            if html_file in project_files:
                main_html = project_files[html_file]
                break
        
        if not main_html:
            raise ValueError("No main HTML file found in project")
        
        # 收集所有CSS文件
        css_content = []
        for file_path, content in project_files.items():
            if file_path.endswith('.css'):
                css_content.append(f"/* {file_path} */\n{content}\n")
        
        # 收集所有JS文件
        js_content = []
        for file_path, content in project_files.items():
            if file_path.endswith('.js'):
                js_content.append(f"// {file_path}\n{content}\n")
        
        # 组装完整的HTML
        assembled_html = main_html
        
        # 替换CSS链接为内联样式
        if css_content:
            combined_css = '\n'.join(css_content)
            css_tag = f'<style>\n{combined_css}\n</style>'
            
            # 查找并替换所有CSS链接
            import re
            assembled_html = re.sub(
                r'<link[^>]*rel=["\']stylesheet["\'][^>]*>',
                '',
                assembled_html
            )
            
            # 在head标签中插入样式
            assembled_html = re.sub(
                r'</head>',
                f'{css_tag}\n</head>',
                assembled_html
            )
        
        # 替换JS链接为内联脚本
        if js_content:
            combined_js = '\n'.join(js_content)
            js_tag = f'<script>\n{combined_js}\n</script>'
            
            # 查找并替换所有JS链接
            assembled_html = re.sub(
                r'<script[^>]*src=[^>]*></script>',
                '',
                assembled_html
            )
            
            # 在body结束标签前插入脚本
            assembled_html = re.sub(
                r'</body>',
                f'{js_tag}\n</body>',
                assembled_html
            )
        
        return assembled_html

    def generate_preview_url(self, path: Path) -> str:
        """
        生成项目预览URL (data URL格式)
        
        Args:
            path: 项目路径
            
        Returns:
            可以直接在浏览器中使用的data URL
        """
        try:
            assembled_html = self.assemble_html_project(path)
            
            # 生成data URL
            import urllib.parse
            encoded_html = urllib.parse.quote(assembled_html)
            data_url = f"data:text/html;charset=utf-8,{encoded_html}"
            
            return data_url
        except Exception as e:
            print(f"Failed to generate preview URL: {e}")
            raise

    def cleanup_sandbox(self, target_path: str = None):
        """
        清理 sandbox 目录
        
        Args:
            target_path: 特定路径的 sandbox 目录，如果为 None 则清理所有
        """
        if target_path:
            path = Path(target_path)
            sandbox_dir = self.ensure_sandbox_directory(target_path)
            if sandbox_dir.exists():
                shutil.rmtree(sandbox_dir)
        else:
            # 清理工作空间内所有 .sandbox 目录
            for sandbox_dir in self.workspace_root.rglob('.sandbox'):
                if sandbox_dir.is_dir():
                    shutil.rmtree(sandbox_dir)


# 工厂函数
def create_sandbox_manager(workspace_root: str = None) -> SandboxManager:
    """
    创建 SandboxManager 实例
    
    Args:
        workspace_root: 工作空间根目录
        
    Returns:
        SandboxManager 实例
    """
    return SandboxManager(workspace_root)
/**
 * title_extractor.ts
 */

/**
 * 从形如 "chapter_{num}_..." 的标识符中提取章节标题。
 *
 * 例如: "chapter_5_model_implementation_execution" => "model implementation execution"
 *
 * @param identifier - 要处理的标识符字符串
 * @returns 提取并用空格连接后的标题
 */
export function extractChapterTitle(identifier: string): string {
    if (!identifier) {
        return '';
    }
    const parts = identifier.split('_');
    // 去掉前两部分："chapter" 和 数字
    const core = parts.slice(2);
    if (core.length === 0) {
        return identifier;
    }
    return core.join(' ');
}

/**
 * 从形如 "..._section_{num}_..." 的标识符中提取小节标题。
 *
 * 例如: "chapter_5_model_implementation_execution_section_1_workflow_initialization" => "workflow initialization"
 *
 * @param identifier - 要处理的标识符字符串
 * @returns 提取并用空格连接后的标题
 */
export function extractSectionTitle(identifier: string): string {
    if (!identifier) {
        return '';
    }
    const marker = '_section_';
    const idx = identifier.indexOf(marker);
    if (idx === -1) {
        // 如果没有找到 section 标记，则退回到章节标题提取
        return extractChapterTitle(identifier);
    }
    // 提取 marker 之后的部分
    const tail = identifier.slice(idx + marker.length);
    const parts = tail.split('_');
    // 去掉第一个部分（章节号）
    const core = parts.slice(1);
    if (core.length === 0) {
        return identifier;
    }
    return core.join(' ');
}

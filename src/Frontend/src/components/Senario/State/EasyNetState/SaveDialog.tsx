import React, { useState } from 'react';
import { Modal, Input, Form, message } from 'antd';

interface SaveDialogProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  initialName?: string;
  initialDescription?: string;
}

const SaveDialog: React.FC<SaveDialogProps> = ({
  visible,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
}) => {
  const [form] = Form.useForm();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave(values.name, values.description || '');
      form.resetFields();
      onClose();
      message.success('图表已保存');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="保存图表"
      open={visible}
      onOk={handleSave}
      onCancel={handleClose}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: initialName,
          description: initialDescription,
        }}
      >
        <Form.Item
          name="name"
          label="图表名称"
          rules={[
            { required: true, message: '请输入图表名称' },
            { max: 50, message: '名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="输入图表名称..." />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述（可选）"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        >
          <Input.TextArea
            placeholder="输入图表描述..."
            rows={3}
            showCount
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveDialog;